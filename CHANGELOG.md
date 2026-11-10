# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

### Added

- One device per facade (up to six, described by their orientation in degrees or
  compass points, with an optional field of view and horizon mask): sun on the
  facade, advised shutter closure, direct sunlight, sun incidence angle, next
  sun arrival and departure.
- Advised closure computed from the sun incidence and elevation in summer,
  always 0 % in winter; season automatic by months, fixed, or forced by a
  scene or the widget.
- The sun position is computed locally (NOAA algorithm) from the house
  location in Gladys: no account, no network.
- Scene trigger "Sun reaches a facade", on arrival or 15, 30 or 60 minutes
  before, with the highest advised closure of the coming sunny period.
- Scene action "Force the season" (summer, winter or back to the
  configuration), for example from an outdoor thermometer.
- Dashboard widget "Sun on the facades", with buttons to force the season.
- Configuration action "Show the advice now".
- Names, texts and documentation in English, French, German and Spanish.
