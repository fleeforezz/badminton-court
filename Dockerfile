FROM nginx:alpine

# Copy the badminton cost-splitter site (index.html + style.css + script.js)
COPY src/index.html /usr/share/nginx/html/index.html
COPY src/style.css  /usr/share/nginx/html/style.css
COPY src/script.js  /usr/share/nginx/html/script.js

# Copy static assets (favicon, QR transfer image, ...)
COPY src/assets/    /usr/share/nginx/html/assets/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]