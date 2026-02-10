# TABZ — SLICE B INDEX (P3–P5)

Date: 2026-02-09T21:12:57

## Golden Rules (LOCKED)
- Add-only work lives under: blueprint-impl/**
- NO wiring into src/** unless you explicitly say: AUTHORIZED TO WIRE
- Slice B is a deterministic lab layer (runtime harness + sims + tests) that does NOT touch prod code
- DO NOT overwrite Slice A files; Slice B adds new runtime engines under pillar*/runtime/**

## Slice B Goals
- Provide deterministic harness + simulation runners
- Exercise Slice A decision surfaces WITHOUT wiring to Nest modules
- Generate proof artifacts (repeatable)

## Layout
- blueprint-impl/runtime-harness/**  (shared deterministic lab)
- blueprint-impl/pillar3/runtime/**  (P3 lab engines)
- blueprint-impl/pillar3/sim/**      (P3 simulations)
- blueprint-impl/pillar3/tests/**    (P3 unit tests later)
- Same pattern for pillar4/pillar5

## Current Status
- You are pinned at: SLICE-A-RESTORE-RECIPE-20260209 (commit 413fa4b)
- Slice B starts from here as add-only commits.
