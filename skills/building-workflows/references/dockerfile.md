# Dockerfile

For ordinary image builds, copy dependency manifests and lockfiles first, install dependencies, and then copy application source before compiling or testing it. Keep package download caches in cache mounts and installed runtime dependencies in image layers. Use standard multi-stage builds to exclude build tools and test fixtures from the runtime image. Build checks must supply their own environment and storage fixtures because workflow URLs, connectors, and volumes belong to execution.

Use the Dockerfile from the template available through the current interface. Templates use versioned OCI base images and normal Dockerfile instructions.

Preserve the template’s install layers and cache mounts. Pin exact versions of direct dependencies in the manifest, keep any lockfile the step already has, and never write a lockfile by hand. Put only the package manager’s download cache and compiler output in them, copy the finished program out of the mount in the same `RUN`, and keep installed runtime dependencies such as `node_modules` in the image. Add npm dependencies to `package.json` so the template’s existing Bun install layer can cache them.
