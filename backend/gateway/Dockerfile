FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf.template

CMD ["/bin/sh", "-c", \
  "envsubst '${CORE_HOST} ${CORE_PORT} ${RAG_HOST} ${RAG_PORT}' \
  < /etc/nginx/nginx.conf.template \
  > /etc/nginx/nginx.conf && nginx -g 'daemon off;'"]