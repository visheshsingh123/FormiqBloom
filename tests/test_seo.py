"""Validate crawl metadata and a future domain migration without a live service."""
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import shutil
import struct
import subprocess
import sys
import tempfile
import unittest
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / 'seo.config.json').read_text())


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.meta, self.canonicals, self.schemas, self.home_links = {}, [], [], []
        self.title, self.h1_count = '', 0
        self.in_title = self.in_schema = False
        self.schema_buffer = ''
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta':
            key = attrs.get('name', attrs.get('property'))
            if key:
                if key in self.meta:
                    raise AssertionError('Duplicate metadata: ' + key)
                self.meta[key] = attrs.get('content', '')
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonicals.append(attrs.get('href'))
        if tag == 'title':
            self.in_title = True
        if tag == 'h1':
            self.h1_count += 1
        if tag == 'script' and attrs.get('type') == 'application/ld+json':
            self.in_schema, self.schema_buffer = True, ''
        if tag == 'a' and 'wordmark' in attrs.get('class', '').split():
            self.home_links.append(attrs.get('href'))

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        if self.in_schema:
            self.schema_buffer += data

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        if tag == 'script' and self.in_schema:
            self.schemas.append(json.loads(self.schema_buffer))
            self.in_schema = False


class SEOTests(unittest.TestCase):
    def test_unique_indexable_page_metadata_and_social_tags(self):
        titles, descriptions = set(), set()
        for item in CONFIG['pages']:
            with self.subTest(page=item['path']):
                page = Page((ROOT / item['file']).read_text())
                canonical = CONFIG['site_url'] + item['path']
                self.assertEqual(page.canonicals, [canonical])
                self.assertEqual(page.h1_count, 1)
                self.assertEqual(page.title, item['title'])
                self.assertEqual(page.meta['description'], item['description'])
                self.assertNotIn(page.title, titles)
                self.assertNotIn(page.meta['description'], descriptions)
                self.assertNotIn('noindex', page.meta['robots'])
                self.assertEqual(page.meta['og:url'], canonical)
                self.assertEqual(page.meta['og:title'], page.title)
                self.assertEqual(page.meta['og:description'], item['description'])
                self.assertEqual(page.meta['twitter:title'], page.title)
                self.assertEqual(page.meta['twitter:card'], 'summary_large_image')
                self.assertEqual(page.meta['og:image'], CONFIG['site_url'] + CONFIG['social_image'])
                self.assertEqual(page.meta['twitter:image'], page.meta['og:image'])
                self.assertTrue(page.meta['og:image:alt'])
                self.assertEqual(page.home_links, [CONFIG['site_url'] + '/'] * 2)
                titles.add(page.title)
                descriptions.add(page.meta['description'])

    def test_schema_describes_confirmed_business_founder_and_projects(self):
        for item in CONFIG['pages']:
            page = Page((ROOT / item['file']).read_text())
            self.assertEqual(len(page.schemas), 1)
            schema = page.schemas[0]
            self.assertEqual(schema['@context'], 'https://schema.org')
            graph = schema['@graph']
            ids = [node['@id'] for node in graph]
            self.assertEqual(len(ids), len(set(ids)))
            org = next(node for node in graph if node['@type'] == 'Organization')
            self.assertEqual(org['name'], 'FormiqBloom')
            self.assertEqual(org['location']['address']['addressLocality'], 'Surat')
            self.assertEqual(org['email'], 'visheshsingh29537@gmail.com')
            self.assertNotIn('aggregateRating', org)
            self.assertNotIn('streetAddress', org['location']['address'])
            person = next(node for node in graph if node['@type'] == 'Person')
            self.assertEqual(person['name'], 'Vishesh Singh')
            self.assertEqual(person['url'], 'https://visheshsingh.vercel.app/')
            if item['path'] != '/':
                crumbs = next(node for node in graph if node['@type'] == 'BreadcrumbList')['itemListElement']
                self.assertEqual([crumb['position'] for crumb in crumbs], [1, 2])
                self.assertEqual(crumbs[-1]['item'], CONFIG['site_url'] + item['path'])
            if item['path'] == '/work':
                self.assertEqual({node['url'] for node in graph if node['@type'] == 'WebApplication'},
                                 {'https://nutriglance.vercel.app/', 'https://relaychatting.vercel.app/'})

    def test_sitemap_robots_image_and_api_indexing(self):
        sitemap = ET.parse(ROOT / 'sitemap.xml')
        locations = [node.text for node in sitemap.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
        self.assertEqual(locations, [CONFIG['site_url'] + page['path'] for page in CONFIG['pages']])
        self.assertEqual(len(locations), len(set(locations)))
        robots = (ROOT / 'robots.txt').read_text()
        self.assertIn('Allow: /\n', robots)
        self.assertNotIn('Disallow: /api/\n', robots)  # API noindex headers must remain crawlable.
        self.assertNotIn('Disallow: /\n', robots)
        self.assertIn('Sitemap: ' + CONFIG['site_url'] + '/sitemap.xml', robots)
        image = (ROOT / CONFIG['social_image'].lstrip('/')).read_bytes()
        self.assertEqual(image[:8], b'\x89PNG\r\n\x1a\n')
        self.assertEqual(struct.unpack('>II', image[16:24]), (1200, 630))
        vercel = json.loads((ROOT / 'vercel.json').read_text())
        self.assertTrue(vercel['cleanUrls'])
        self.assertEqual(vercel['functions']['api/chat.js']['maxDuration'], 30)
        self.assertEqual(vercel['functions']['api/contact.js']['maxDuration'], 30)
        self.assertTrue(any(rule['source'] == '/api/:path*' and
                            {'key': 'X-Robots-Tag', 'value': 'noindex, nofollow, nosnippet'} in rule['headers']
                            for rule in vercel['headers']))
        for file in ROOT.glob('google*.html'):
            self.assertEqual(file.read_text().strip(), 'google-site-verification: ' + file.name)

    def test_generator_is_repeatable_and_migrates_domain_without_touching_verification(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            (target / 'scripts').mkdir()
            shutil.copy2(ROOT / 'scripts/update_seo.py', target / 'scripts/update_seo.py')
            for file in ['seo.config.json', 'sitemap.xml', 'robots.txt'] + [page['file'] for page in CONFIG['pages']]:
                shutil.copy2(ROOT / file, target / file)
            verification = target / 'google-example.html'
            verification.write_text('google-site-verification: google-example.html')
            def digest():
                return {file.name: hashlib.sha256(file.read_bytes()).hexdigest()
                        for file in target.iterdir() if file.is_file()}
            before = digest()
            def run(*args):
                return subprocess.run([sys.executable, str(target / 'scripts/update_seo.py'), *args],
                                      capture_output=True, text=True)
            self.assertEqual(run().returncode, 0)
            self.assertEqual(digest(), before)
            self.assertNotEqual(run('--site-url', 'http://invalid.example/path').returncode, 0)
            self.assertEqual(digest(), before)
            self.assertEqual(run('--site-url', 'https://example.in').returncode, 0)
            for item in CONFIG['pages']:
                source = (target / item['file']).read_text()
                parsed = Page(source)
                self.assertEqual(parsed.canonicals, ['https://example.in' + item['path']])
                self.assertEqual(parsed.home_links, ['https://example.in/'] * 2)
                self.assertEqual(parsed.meta['og:image'], 'https://example.in' + CONFIG['social_image'])
                self.assertNotIn(CONFIG['site_url'], source)
                original_body = (ROOT / item['file']).read_text().split('<body', 1)[1]
                self.assertEqual(source.split('<body', 1)[1], original_body.replace(CONFIG['site_url'] + '/', 'https://example.in/'))
            self.assertIn('https://example.in/sitemap.xml', (target / 'robots.txt').read_text())
            self.assertNotIn(CONFIG['site_url'], (target / 'sitemap.xml').read_text())
            self.assertEqual(verification.read_text(), 'google-site-verification: google-example.html')


if __name__ == '__main__':
    unittest.main()
