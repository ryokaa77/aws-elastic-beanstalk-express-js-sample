# Use official Node.js 16 runtime as base image
FROM node:16-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --save

# Copy application code
COPY . .

# Expose port
EXPOSE 8080


# Start application
CMD ["npm", "start"]
