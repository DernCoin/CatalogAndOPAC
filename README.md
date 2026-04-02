# CatalogAndOPAC Prototype

This repository now contains two connected, separate web applications:

- **ILS (`/ils`)** for library staff workflows.
- **OPAC (`/opac`)** for patron-facing discovery and catalog browsing.

Both sites share the same visual language through `shared/styles.css` and use browser `localStorage` to share catalog data.

## Included ILS Features

- Dashboard with:
  - Visitor counter.
  - Reference question counter.
  - Daily key metric cards.
  - "Items needing attention" list.
- Circulation check-in/check-out workflow (scan patron + item barcode).
- Cataloging form to add new items.
- Acquisitions workflow for orders and donation batches.
- Patron add/edit management.
- Interlibrary loan request tracker.
- Daily register log.
- Administration settings:
  - Circulation rules.
  - Receipt preferences.
  - Authority heading field.
- Reports summary panel.

## Included OPAC Features

- Discovery-focused homepage with:
  - Recently added horizontal scroller.
  - Discovery blocks (staff picks/booklists/random shelf prompt).
- Catalog view with search in the **upper-right header**.
- Item detail modal opened from catalog results.
- Item details originate from the same catalog data written in the ILS.

## Run locally

Because this is plain HTML/CSS/JS, open each site directly:

- `ils/index.html`
- `opac/index.html`

Or serve the repo with any static file server.
