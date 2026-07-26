# Etapa 1: Construcción (Actualizado a Node.js 22)
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Etapa 2: Servidor Nginx para producción
FROM nginx:alpine

# Copiamos la salida compilada de Angular
COPY --from=build /app/dist/supplies-front/browser /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]