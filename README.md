
<p align="center">
    <img src=".imgs/icon.png" width="200"/>
</p>

# Scaddr Backend

---

Backend code for the [Scaddr project](https://github.com/scaddr).

The backend runs as a Node.js server and saves all the user information into a Redis instance. (could've been just a JSON object, but what's done is done *for now*)

Goals and features: 
 - [x] Create Room Endpoint
 - [x] Join Room Endpoint
 - [x] On Disconnect Data Cleanup Endpoint
 - [x] Verify User Session Endpoint
 - [x] Start Game Endpoint
 - [x] Poke Answer Endpoint
 - [ ] Award points/score to the players each round 
 - [ ] Ending Screen Implementation?  
 - [ ] Suggestions?

## Building

### Redis 

Before actually running the backend, we have to setup a Redis database somewhere. This could be either on your local machine, some local server, or the cloud. If you already have a dedicated Redis server up and running, feel free to skip to the next sub-chapter of this guide. (Environment Variables)

For easy local deployment, the repository provides an example `docker-compose.yml` file (inside the `services/` folder) which you can use to start a docker instance of the [Redis Stack](https://redis.io/docs/about/about-stack/).

Here we assume you already know how to work with [Docker containers](https://docs.docker.com/get-started/) and [Docker Compose](https://docs.docker.com/get-started/08_using_compose/). To learn more about these subjects, please refer to the respective links.

Steps to setup a local Redis instance: 
 - Go into the services folder `cd services/`
 - Run Docker Compose `docker-compose up` 
 - Enjoy

### Environment Variables

List of Environment Variables you need to be aware of for both local and production deployment: 
 - `REDIS`: variable to set the location of your Redis server
   - By default connects to `localhost:6379`

For more information, please refer to the `redis.js` file in the root of the project

### Backend

Assuming the developer: 
 - already installed the necessary tools to work with a [Node.js](https://vuejs.org/) project, 
 - deployed a Redis instance, 
 - configured the environment variables properly.

These are the steps one should follow to run the backend on their local machine:
 - Clone the repository `git clone https://github.com/scaddr/scaddr-backend`
 - Go into the backend directory `cd scaddr-backend`
 - Install all the node dependencies `npm install`
 - Run the backend `npm start`
 - Enjoy

## Contributions 

We highly encourage playing around with the software and contributing to the project.
Before opening a pull request, the contributor is expected to open an issue in which they thoroughly describe the issue (or feature) they're solving (or implementing).

## Discussions 

If you have any suggestions, ideas, or questions, feel free to ask them in the discussions tab of this project.

## License 

Scaddr Backend is licensed under the MIT license. See the `LICENSE` file for more information