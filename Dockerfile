# Use the official Node.js image
FROM node:latest


# Set the working directory inside the container
WORKDIR /app


# Set the working directory inside the container to /usr/src/app/src
COPY . .


# Install dependencies
RUN npm install

# Expose the port the app runs on
EXPOSE 8000

# Command to run the app
CMD ["npm", "run", "dev"]
