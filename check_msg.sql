USE arise;
SELECT id, group_id, sender_name, message_text, created_at FROM chat_messages ORDER BY created_at DESC LIMIT 5;
