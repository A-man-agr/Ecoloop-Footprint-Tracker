FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static website files
COPY index.html styles.css app.js calculations.js globe.js game.js settings.js cache-buster.js manifest.json sw.js /usr/share/nginx/html/
COPY js/ /usr/share/nginx/html/js/

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
