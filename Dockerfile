FROM denoland/deno:alpine

# Set the working directory
WORKDIR /app

# Copy configuration files
COPY deno.json .

# Cache dependencies
RUN deno cache deno.json

# Copy the rest of the application
COPY . .

# Build the React application
RUN deno task build

# Expose the port
EXPOSE 3030

# Start the application
CMD ["deno", "task", "serve"]
