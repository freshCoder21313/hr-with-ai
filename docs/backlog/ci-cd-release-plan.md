# CI/CD Release Workflow Plan

## Objective
Update the existing `.github/workflows/ci.yml` to automatically create a GitHub Release and attach the build artifacts when a version tag (e.g., `v1.0.0`) is pushed.

## Current State
- Workflow triggers on `push` and `pull_request` to `main`.
- Jobs: `build` (Installs, Typechecks, Tests, Builds).
- Artifacts: None currently uploaded.

## Proposed Changes

1.  **Update Triggers**:
    - Add `tags: ['v*']` to the `push` event to trigger the workflow on version tags.

2.  **Update `build` Job**:
    - Add a step to upload the `dist` folder (production build) using `actions/upload-artifact@v4`. This allows the release job to access the built files.

3.  **Add `release` Job**:
    - **Dependency**: `needs: build` (waits for build to succeed).
    - **Condition**: `if: startsWith(github.ref, 'refs/tags/')` (only runs on tag pushes).
    - **Permissions**: `contents: write` (required to create releases).
    - **Steps**:
        - Download artifacts from the `build` job.
        - Create a ZIP archive of the `dist` folder (`build.zip`).
        - Use `softprops/action-gh-release@v2` to:
            - Create a new release based on the tag.
            - Upload `build.zip` as a release asset.
            - Auto-generate release notes.

## Workflow YAML Structure

```yaml
name: CI

on:
  push:
    branches: [main]
    tags: ['v*'] # New trigger
  pull_request:
    branches: [main]

permissions:
  contents: write # Needed for release creation

jobs:
  build:
    runs-on: ubuntu-latest
    # ... existing matrix strategy ...
    steps:
      # ... existing steps (checkout, install, test, build) ...
      
      - name: Archive build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-dist
          path: dist

  release:
    needs: build
    if: startsWith(github.ref, 'refs/tags/')
    runs-on: ubuntu-latest
    steps:
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build-dist
          path: dist

      - name: Zip build artifacts
        run: zip -r build.zip dist

      - name: Create Release
        uses: softprops/action-gh-release@v2
        with:
          files: build.zip
          generate_release_notes: true
```
