const express = require("express");
const axios = require("axios");
const redis = require("redis");

const PORT = process.env.PORT || 5000;
const REDIS_PORT = process.env.PORT || 6379;
const client = redis.createClient(REDIS_PORT);

(async () => {
  await client.connect();
})();

client.on("connect", () => console.log("Redis Client Connected"));
client.on("error", (err) => console.log("Redis Client Connection Error", err));

const app = express();

// Set response
const setResponse = (username, repos) => {
  return `<h2>${username} has ${repos} Github repos</h2>`;
};

// Cache middleware
async function cache(req, res, next) {
  const { username } = req.params;

  const data = await client.get(username);

  console.log("data:", data);

  if (data !== null) {
    return res.send(setResponse(username, data));
  } else {
    next();
  }
}

// Make request to github for data
const getRepos = async (req, res, next) => {
  try {
    console.log("Fetching data...");
    const { username } = req.params;

    const { data } = await axios.get(
      `https://api.github.com/users/${username}`
    );
    // console.log("response: ", response);
    // const data = await response.JSON();
    console.log("data: ", data);

    client.setEx(username, 3600, data.public_repos);

    res.send(setResponse(username, data.public_repos));
  } catch (error) {
    console.error(error);
    res.status(500);
  }
};

app.get("/repos/:username", cache, getRepos);

app.listen(5000, () => {
  console.log(`App is listening on port ${PORT}`);
});
