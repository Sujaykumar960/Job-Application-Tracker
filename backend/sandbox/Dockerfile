FROM python:3.12-alpine

# Create unprivileged runner user matching backend group (GID 1001)
RUN addgroup -g 1001 -S sandboxgroup && adduser -u 1001 -S sandboxuser -G sandboxgroup

WORKDIR /sandbox

COPY server.py .

# Pre-create IPC directory with correct ownership (GID 1001) for socket creation
RUN mkdir -p /sandbox_ipc && chown -R sandboxuser:sandboxgroup /sandbox_ipc && chmod 775 /sandbox_ipc

# Drop privileges to non-root user
USER sandboxuser

EXPOSE 2000

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    SANDBOX_PORT=2000

CMD ["python", "server.py"]
