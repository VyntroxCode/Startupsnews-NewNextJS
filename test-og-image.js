#!/usr/bin/env node

/**
 * Quick test for og:image extraction
 */

// Test the extractOgImageFromHtml function
const testHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta property="og:image" content="https://example.com/image.jpg" />
  <meta property="og:title" content="Test Article" />
</head>
<body>
  <h1>Test</h1>
</body>
</html>
`;

function extractOgImageFromHtml(html) {
  try {
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (ogImageMatch && ogImageMatch[1]) {
      return ogImageMatch[1];
    }
    const twitterMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
    if (twitterMatch && twitterMatch[1]) {
      return twitterMatch[1];
    }
  } catch (err) {
    console.error('Error parsing HTML:', err);
  }
  return null;
}

function isImageUrl(url) {
  const normalized = (url || '').toLowerCase();
  const urlWithoutParams = normalized.split('?')[0];
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const hasImageExt = imageExtensions.some(ext => urlWithoutParams.includes(ext));
  const hasNoPageExt = !urlWithoutParams.includes('.html') && !urlWithoutParams.includes('.htm');
  
  return hasImageExt || (hasNoPageExt && urlWithoutParams.includes('image'));
}

console.log('Testing og:image extraction...\n');

// Test 1: Extract og:image from HTML
const extracted = extractOgImageFromHtml(testHtml);
console.log('Test 1 - Extract og:image from HTML');
console.log('Expected: https://example.com/image.jpg');
console.log('Got:     ', extracted);
console.log('Result:  ', extracted === 'https://example.com/image.jpg' ? '✓ PASS' : '✗ FAIL\n');

// Test 2: isImageUrl function
console.log('\nTest 2 - isImageUrl detection');
const testCases = [
  { url: 'https://example.com/image.jpg', expected: true },
  { url: 'https://example.com/article', expected: false },
  { url: 'https://example.com/article.html', expected: false },
  { url: 'https://cdn.example.com/image.jpg?v=123', expected: true },
  { url: 'https://example.com/image.png', expected: true },
  { url: 'https://example.com/article.htm', expected: false },
];

testCases.forEach((test) => {
  const result = isImageUrl(test.url);
  const status = result === test.expected ? '✓' : '✗';
  console.log(`${status} ${test.url} => ${result} (expected ${test.expected})`);
});

console.log('\nAll tests completed!');
