#!/usr/bin/env bash
. ./setenv.sh

if [[ $1 == "prod" ]]; then
    echo "Look for image based on name";
    IMAGE_ID=$(docker images --filter=reference=$IMAGE_NAME --format "{{.ID}}");
    if [[ "$(echo $IMAGE_ID)" == "" ]]; then
        echo "App image not found, loading from file";
    else
        # image found, remove it so it can be loaded clean from the current folder
        echo "App image found";
        echo "...removing it so it can be loaded clean from the image file in the current dir";
        docker rmi -f $IMAGE_ID;
    fi
    echo "...loading the docker image from file";
    docker load < image.tar.gz;
    echo "Image loaded successfully";

    # start up the container
    echo "...starting up container";
    if ! docker-compose -f app-compose.yaml -f app-compose.networks.yaml up -d; then
        echo "$IMAGE_NAME not started";
    else
        echo "$IMAGE_NAME started";
    fi
else
    echo "...starting up container locally";
    # start up the container
    docker-compose -f app-compose.yaml up -d;
fi