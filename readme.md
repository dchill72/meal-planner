# Super WIP WIP WIP WIP

### Dev setup

- docker desktop
- Go 1.21+
- [mongo docs](https://www.mongodb.com/docs/drivers/go/current/)

### Common commands

```
make run              # run the Go API locally
make build            # build the Go API binary
make test             # run all tests (API + client)
make lint             # go vet
make tidy             # go mod tidy
```

```
make docker-up        # start all containers (detached)
make docker-down      # stop all containers
make docker-mongo-up  # start MongoDB only
make docker-build     # build both Docker images
```

```
make client-start     # start the client dev server
make client-test      # run client tests
```

Run `make help` for the full list.

### First-time setup

```
cd api-go && go mod tidy
```

### Access mongo container

```
docker exec -it meal-planner-mongo-1 /bin/bash
```

### Mongo CLI from container

```
mongo mealplanner -u service -p secret
> use mealplanner
> show collections
```
