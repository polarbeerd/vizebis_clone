FROM python:3.12-slim
WORKDIR /app
RUN echo "deb http://deb.debian.org/debian bookworm contrib" >> /etc/apt/sources.list.d/contrib.list && \
    apt-get update && apt-get install -y --no-install-recommends \
    fonts-crosextra-carlito fonts-liberation \
    libpango-1.0-0 libpangocairo-1.0-0 libpangoft2-1.0-0 \
    libharfbuzz0b libfontconfig1 libgdk-pixbuf-2.0-0 \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
