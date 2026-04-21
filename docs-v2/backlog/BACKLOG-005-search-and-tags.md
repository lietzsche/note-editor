# BACKLOG-005: Search and Tag Management System

- Version: v1.0
- Date: 2026-04-21
- Status: Planning
- Priority: Medium
- Related docs:
  - `docs-v2/product/PRD.md` (SR-13)
  - `docs-v2/features/FEATURE-009-search-and-tags.md`
  - `docs-v2/testing/backlog/TEST-BACKLOG-005-search-and-tags.md`

## Summary

This backlog item adds comprehensive search functionality and tag management system to the note-editor application. Users will be able to search through note titles and content, create and manage tags, and filter notes by tags for better organization.

## Business Value

1. **Improved Discoverability**: Users can quickly find notes using search
2. **Enhanced Organization**: Tags provide flexible categorization beyond groups
3. **Increased Productivity**: Faster note retrieval saves time
4. **Better Content Management**: Multi-dimensional organization (groups + tags)

## Requirements

### Search Functionality
1. Full-text search across note titles and content
2. Real-time search results as user types
3. Advanced search operators (AND, OR, NOT, quotes for exact phrases)
4. Search history and saved searches
5. Search within specific groups or tags

### Tag Management
1. Create, edit, and delete tags
2. Assign multiple tags to a single note
3. Filter notes by one or more tags
4. Tag autocomplete when assigning tags
5. Tag cloud visualization (popular tags)
6. Tag merging and bulk operations

### User Experience
1. Intuitive search interface with clear filters
2. Visual tag management interface
3. Keyboard shortcuts for common operations
4. Search result highlighting
5. Performance optimization for large note collections

## Technical Scope

### Database Changes
1. **New Tables**
   - `tags` table: `id`, `user_id`, `name`, `color` (optional), `created_at`
   - `note_tags` junction table: `note_id`, `tag_id`, `created_at`

2. **Indexes**
   - Full-text search index on `pages.title` and `pages.content`
   - Index on `tags.name` and `tags.user_id`
   - Composite index on `note_tags.note_id` and `note_tags.tag_id`

### Backend Changes
1. **Search API Endpoints**
   - `GET /api/search?q=keyword&group_id=...&tag_ids=...` - Search notes
   - `GET /api/search/suggestions?q=partial` - Search suggestions
   - `GET /api/search/history` - Search history

2. **Tag API Endpoints**
   - `GET /api/tags` - List user's tags
   - `POST /api/tags` - Create new tag
   - `PUT /api/tags/:id` - Update tag
   - `DELETE /api/tags/:id` - Delete tag
   - `POST /api/notes/:id/tags` - Assign tags to note
   - `DELETE /api/notes/:id/tags/:tag_id` - Remove tag from note

3. **Search Implementation**
   - SQLite full-text search (FTS5) for local development
   - Cloudflare D1 full-text search capabilities
   - Alternative: Client-side search with indexing for small datasets
   - Fallback: Simple LIKE-based search for compatibility

### Frontend Changes
1. **Search Components**
   - Search bar with autocomplete
   - Search results panel
   - Advanced search filters UI
   - Search history component

2. **Tag Components**
   - Tag input with autocomplete
   - Tag management modal
   - Tag cloud visualization
   - Tag filtering controls

3. **Integration**
   - Add tag management to note editor
   - Integrate search into main navigation
   - Update note list to show tags

## Implementation Tasks

### Phase 1: Database and API Foundation
1. Create database migrations for tags and note_tags tables
2. Implement basic tag CRUD API endpoints
3. Implement basic search API endpoint
4. Add full-text search index setup

### Phase 2: Core Search Functionality
1. Implement frontend search interface
2. Add real-time search results
3. Implement search history
4. Add search result highlighting

### Phase 3: Tag Management System
1. Implement tag input component with autocomplete
2. Add tag management UI
3. Implement tag filtering in note list
4. Add tag cloud visualization

### Phase 4: Advanced Features and Polish
1. Implement advanced search operators
2. Add saved searches functionality
3. Optimize search performance
4. Cross-browser testing and accessibility

## Dependencies

1. **External Libraries** (Optional)
   - `fuse.js` or `lunr.js` for client-side search
   - `react-select` or similar for tag input
   - `d3-cloud` for tag cloud visualization

2. **Database Requirements**
   - SQLite FTS5 extension for local development
   - D1 full-text search support evaluation

## Performance Considerations

1. **Search Performance**
   - Implement search result pagination
   - Consider client-side indexing for small datasets
   - Cache frequent search results
   - Debounce search input

2. **Tag Performance**
   - Limit number of tags per note (e.g., max 20)
   - Implement tag suggestion caching
   - Optimize tag filtering queries

3. **Scalability**
   - Evaluate need for dedicated search service at scale
   - Consider Elasticsearch or similar for large deployments
   - Implement incremental search index updates

## Testing Strategy

### Unit Tests
1. Search query parsing and normalization
2. Tag validation and sanitization
3. Search algorithm correctness
4. Tag autocomplete logic

### Integration Tests
1. Search API endpoint testing
2. Tag assignment and filtering
3. Search within specific groups
4. Concurrent tag operations

### Manual Testing
1. Search accuracy with various query types
2. Tag management flow
3. Performance with large datasets
4. Cross-browser compatibility

## Success Metrics

1. **Search Usage**: % of sessions with search activity
2. **Search Success Rate**: % of searches with relevant results
3. **Tag Adoption**: % of notes with at least one tag
4. **Search Performance**: Average search response time
5. **User Satisfaction**: Feedback on search and tag features

## Risks and Mitigation

### Technical Risks
1. **Search Performance**: Full-text search may be slow on large datasets
   - Mitigation: Implement pagination, caching, consider dedicated search service
2. **Database Complexity**: Tag system adds join complexity
   - Mitigation: Optimize queries, add appropriate indexes
3. **Browser Memory**: Client-side search may use significant memory
   - Mitigation: Implement lazy loading, limit indexed content

### User Experience Risks
1. **Tag Overload**: Users may create too many tags, reducing usefulness
   - Mitigation: Tag suggestions, tag merging, usage analytics
2. **Search Complexity**: Advanced search may confuse users
   - Mitigation: Progressive disclosure, search examples, tooltips

## Migration Plan

1. **Phase 1** (Weeks 1-2): Database migrations, existing notes remain unchanged
2. **Phase 2** (Weeks 3-4): Basic search and tag APIs, backward compatible
3. **Phase 3** (Weeks 5-6): Frontend integration, opt-in features
4. **Phase 4** (Weeks 7-8): Advanced features, performance optimization

## Related Backlog Items

- `BACKLOG-004-pwa-support.md`: Search should work offline
- `BACKLOG-006-note-sharing.md`: Search should include shared notes (if applicable)

## Notes

1. Consider implementing tag colors for better visual distinction
2. Evaluate need for tag hierarchies or nested tags
3. Consider tag synonyms or automatic tagging
4. Privacy consideration: Search queries may contain sensitive information