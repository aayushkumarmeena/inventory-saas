# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /build

# Backend base URL to bake into the JS bundle at build time (Vite inlines
# import.meta.env.* values during build, they cannot be changed at runtime).
ARG VITE_API_URL=http://localhost:8080/api/v1
ENV VITE_API_URL=$VITE_API_URL

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 \
  CMD wget -qO- http://localhost:80/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
