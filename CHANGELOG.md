# Changelog

## v3.0.0 - Knowledge Retrieval & Platform Improvements

### Backend
- Removed dependency on Emergent private packages
- Replaced Emergent integrations with direct Anthropic SDK integration
- Added ParadeDB BM25 knowledge retrieval
- Added MongoDB fallback path for retrieval resilience
- Added knowledge retrieval observability and logging
- Added ParadeDB status and synchronization endpoints
- Added MongoDB → ParadeDB indexing workflow

### Knowledge Base
- Replaced static knowledge dumping with query-driven retrieval
- Added BM25 relevance ranking using ParadeDB
- Added knowledge source indexing and synchronization
- Preserved MongoDB as the source of truth for knowledge content

### Frontend
- Improved Analytics dashboard
- Improved Bot Settings experience
- Added support for ParadeDB administration and monitoring
