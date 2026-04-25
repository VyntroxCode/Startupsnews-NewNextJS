const fs = require('fs');

async function testUpload() {
  const token = 'fake_token';
  const formData = new FormData();
  formData.append('file', new Blob(["test image data"]), 'test.jpg');

  const uploadResponse = await fetch('http://localhost:3000/api/admin/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Admin-Token': token,
    },
    body: formData,
  });

  const text = await uploadResponse.text();
  console.log("STATUS:", uploadResponse.status);
  console.log("RESPONSE:", text);
}

testUpload();
