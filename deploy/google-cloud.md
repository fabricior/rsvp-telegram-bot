# Deploying to Google Cloud

## Cloud Run using Artifact Registry

### Prerequisites

- Using Google Console:
    - Enable Artifact Registry
    - Create a Docker Repo in Artifact Registry. You will need to pick a *region*.

- Install Google Cloud SDK Shell in your local machine

- Using the Google Cloud SDK Shell, run:

    `gcloud auth configure-docker southamerica-east1-docker.pkg.dev`

    where `southamerica-east1` is the region you selected upon docker repo creation. 

### Pushing the image


```shell
docker build --tag rsvp-telegram-bot:latest .

docker tag rsvp-telegram-bot:latest southamerica-east1-docker.pkg.dev/rsvp-telegram-bot-01/docker-repo/rsvp-telegram-bot:latest

docker push southamerica-east1-docker.pkg.dev/rsvp-telegram-bot-01/docker-repo/rsvp-telegram-bot:latest
```

Where:
- `southamerica-east1` is the region you selected upon docker repo creation. 
- `rsvp-telegram-bot-01` is the project id. ⚠ Keep in mind that it might be different from the project name
- `docker-repo` is the repo name in Artifact Registry
