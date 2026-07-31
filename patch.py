import re

with open("myapp.conf", "r", encoding="utf-16") as f:
    content = f.read()

replacement = """    location /arise/ {
        rewrite ^/arise/(.*) /$1 break;
        proxy_pass http://localhost:5003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {"""

content = re.sub(r"server_name institute-api.rhaitech.online;\s+location / \{", "server_name institute-api.rhaitech.online;\n\n" + replacement, content)

with open("myapp_patched.conf", "w", encoding="utf-8") as f:
    f.write(content)
