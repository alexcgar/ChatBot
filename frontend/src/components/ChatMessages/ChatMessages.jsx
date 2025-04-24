import React from 'react';

const ChatMessages = ({ messages }) => (
  <div>
    {messages.map((item, idx) => (
      <div key={idx}>
        <strong>{item.question}</strong>
        <p>{item.answer}</p>
      </div>
    ))}
  </div>
);

export default ChatMessages;
