
# Google AI Overview Scraper (Research Extension)

## Overview

This Chrome extension automatically captures and stores **Google Search data**, with a specific focus on **AI Overviews**. It is designed as a lightweight, extensible tool for researchers interested in studying how search engines present AI-generated summaries and how users interact with them.

Developed at the **University of Amsterdam** as part of a PhD project.

## What it does

When a user performs a Google search, the extension:

* Extracts the **search query**
* Captures the **AI Overview** (if present), including:

  * Generated text
  * Embedded links / citations
* Collects **organic search result links**
* Stores everything locally in the browser

Each search session is saved as a structured record containing:

* Query
* Page title
* URL
* Timestamp
* AI Overview content
* Result links

<img width="797" height="594" alt="image" src="https://github.com/user-attachments/assets/1d9c93e2-8627-496c-a953-eedabd5a06a5" />


## How it works

The extension uses:

* **Content scripts** to read the Google Search DOM
* **Heuristic extraction methods** to identify AI Overview blocks (since Google frequently changes structure)
* A **MutationObserver** to detect dynamically loaded content
* **Chrome Storage API** (`chrome.storage.local`) to persist collected data
* A simple **popup interface** to:

  * View collected data
  * Export it as JSON
  * Clear stored data

The tool does not rely on a single selector, but uses proximity to headings like “AI Overview” and structural cues to capture the correct content block

## Research Use Case

This extension is intended as a **data donation framework**.

### Example usage:

* Recruit participants
* Ask them to install the extension
* Let them browse/search naturally
* Collect structured logs of:

  * Queries
  * AI-generated summaries
  * Source links

This allows researchers to study:

* Exposure to AI-generated knowledge
* Source attribution in AI Overviews
* Search behavior in hybrid (AI + traditional) SERPs

## Ethical Considerations

This tool is designed for **research purposes only**.

If used with human participants, researchers should ensure:

* Informed consent
* Transparency about data collection
* Compliance with institutional and legal data protection standards (e.g., GDPR)


## Planned / Recommended Extensions

### 1. Data Anonymization

If deploying with participants, anonymization should be implemented, such as:

* Removing or hashing identifiable queries
* Filtering personal or sensitive content
* Assigning anonymous participant IDs


### 2. Simulated User Protocol (Upcoming)

A planned extension is a **Selenium-based automation framework** that:

* Simulates user search behavior
* Collects AI Overview data at scale
* Reduces reliance on human participants
* Avoids ethical/privacy concerns tied to real user data


## Installation

1. Download or clone this repository
2. Go to `chrome://extensions`
3. Enable **Developer Mode**
4. Click **Load unpacked**
5. Select the extension folder


## Data Export

* Open the extension popup
* Click **Export**
* Data is downloaded as JSON


## Limitations

* Google frequently updates its DOM structure → scraping may break
* AI Overviews are not always present
* Heuristic extraction may occasionally miss or partially capture content

## Contributions

This is a research tool — contributions are welcome, especially:

* More robust extraction strategies
* Better anonymization pipelines
* Integration with databases or APIs
* Experimental logging features

## Contact

nadalic.sotic@uva.nl
