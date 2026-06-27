fetch('http://localhost:3001/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello, are you working?' }],
    model: 'openai/gpt-4o-mini'
  })
})
.then(res => {
  console.log('Status:', res.status);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  return reader.read().then(function processText({ done, value }) {
    if (done) {
      console.log('Stream complete');
      return;
    }
    console.log(decoder.decode(value));
    return reader.read().then(processText);
  });
})
.catch(err => console.error(err));
