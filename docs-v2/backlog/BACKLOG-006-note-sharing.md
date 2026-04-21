# BACKLOG-006: Note Sharing Functionality

- Version: v1.0
- Date: 2026-04-21
- Status: Planning
- Priority: Medium
- Related docs:
  - `docs-v2/product/PRD.md` (SR-14)
  - `docs-v2/features/FEATURE-010-note-sharing.md`
  - `docs-v2/testing/backlog/TEST-BACKLOG-006-note-sharing.md`

## Summary

This backlog item adds secure note sharing functionality to the note-editor application. Users will be able to generate read-only shareable links for their notes, allowing others to view the note content without requiring login. Share links can be revoked or expired at any time.

## Business Value

1. **Collaboration Enablement**: Share notes with colleagues, friends, or family
2. **Content Distribution**: Distribute notes as reference materials or documentation
3. **Increased Engagement**: Shareable content can bring new users to the platform
4. **Flexible Privacy**: Control over what content is publicly accessible

## Requirements

### Share Link Generation
1. Generate unique, unguessable share links for notes
2. Set expiration dates for share links (24h, 7d, 30d, never)
3. Limit number of views or access attempts
4. Password protection option for sensitive notes
5. Preview of shared note before finalizing sharing

### Share Link Management
1. List all active share links for user's notes
2. Revoke share links immediately
3. View access statistics (view count, last accessed)
4. Edit share link settings (expiration, password)
5. Bulk operations (revoke all, extend expiration)

### Access Control
1. Read-only access for shared links
2. No authentication required for viewing shared notes
3. Prevention of editing, copying, or downloading restrictions
4. Rate limiting to prevent abuse
5. Content sanitization (strip sensitive metadata)

### User Experience
1. Clear sharing status indicators in UI
2. Copy share link to clipboard with one click
3. QR code generation for mobile sharing
4. Share via social media or email options
5. Access history and analytics dashboard

## Technical Scope

### Database Changes
1. **New Tables**
   - `share_links` table: `id`, `note_id`, `user_id`, `token`, `expires_at`, `max_views`, `view_count`, `password_hash`, `created_at`, `last_accessed_at`, `is_active`
   - `share_access_logs` table: `id`, `share_link_id`, `accessed_at`, `ip_address`, `user_agent`, `referrer`

2. **Indexes**
   - Index on `share_links.token` for fast lookup
   - Index on `share_links.note_id` for note-based queries
   - Index on `share_links.user_id` for user management
   - Index on `share_links.expires_at` for cleanup jobs

### Backend Changes
1. **Share Link API Endpoints**
   - `POST /api/notes/:id/share` - Create share link
   - `GET /api/share/links` - List user's share links
   - `GET /api/share/links/:id` - Get share link details
   - `PUT /api/share/links/:id` - Update share link settings
   - `DELETE /api/share/links/:id` - Revoke share link
   - `GET /api/share/stats/:id` - Get share link statistics

2. **Public Access Endpoints**
   - `GET /s/:token` - Public access to shared note
   - `POST /s/:token/verify` - Password verification for protected shares
   - `GET /s/:token/preview` - Limited preview without full access

3. **Security Features**
   - Token generation using cryptographically secure random bytes
   - Rate limiting per IP for public access
   - Content sanitization before serving
   - Expired link automatic cleanup

### Frontend Changes
1. **Sharing Components**
   - Share button and modal in note editor
   - Share link management panel
   - Access statistics dashboard
   - QR code generator for share links

2. **Public View Components**
   - Read-only note viewer for shared links
   - Password entry form for protected shares
   - Expired/invalid link error pages
   - "Copy link" and social sharing buttons

3. **Integration**
   - Add sharing options to note context menu
   - Integrate sharing status into note list
   - Add sharing analytics to user dashboard

## Implementation Tasks

### Phase 1: Core Infrastructure
1. Create database migrations for share_links and share_access_logs tables
2. Implement token generation and validation utilities
3. Create basic share link CRUD API endpoints
4. Implement public access endpoint with security checks

### Phase 2: Share Management UI
1. Implement share modal in note editor
2. Create share link management panel
3. Add sharing status indicators to UI
4. Implement copy-to-clipboard and QR code features

### Phase 3: Advanced Features
1. Add password protection for shares
2. Implement access statistics and analytics
3. Add expiration and view limit options
4. Implement bulk operations for share management

### Phase 4: Polish and Security
1. Implement rate limiting and abuse prevention
2. Add content sanitization and privacy protections
3. Cross-browser testing and accessibility
4. Performance optimization for high-traffic shares

## Security Considerations

### Token Security
1. Use cryptographically secure random tokens (minimum 32 bytes)
2. Token entropy should withstand brute force attacks
3. Implement token rotation if compromise suspected
4. Log all access attempts for security monitoring

### Access Control
1. Ensure shared links cannot be used to access other notes
2. Prevent privilege escalation through share links
3. Implement proper CORS and CSRF protection
4. Sanitize note content to remove sensitive metadata

### Rate Limiting
1. Implement IP-based rate limiting for public access
2. Limit share link creation per user
3. Monitor for abnormal access patterns
4. Implement CAPTCHA for suspicious activity

## Performance Considerations

1. **Caching Strategy**
   - Cache public note views with appropriate TTL
   - Implement CDN caching for high-traffic shares
   - Cache share link metadata to reduce database load

2. **Database Optimization**
   - Partition share_access_logs by date for large volumes
   - Implement archive strategy for old access logs
   - Optimize queries for share link listing and statistics

3. **Scalability**
   - Consider dedicated route for public shares (`/s/`)
   - Implement load balancing for public access endpoints
   - Monitor performance impact of share analytics

## Testing Strategy

### Unit Tests
1. Token generation and validation
2. Share link expiration logic
3. Access counting and statistics
4. Password protection verification

### Integration Tests
1. Share link creation and access flow
2. Expiration and revocation scenarios
3. Rate limiting and abuse prevention
4. Concurrent access to shared notes

### Security Tests
1. Token guessing and brute force prevention
2. Access control bypass attempts
3. SQL injection and XSS vulnerabilities
4. Privacy leakage through shared content

### Manual Testing
1. Cross-browser compatibility for public view
2. Mobile responsiveness of shared notes
3. Social media sharing previews
4. QR code scanning and accessibility

## Success Metrics

1. **Sharing Adoption**: % of users who create at least one share link
2. **Share Engagement**: Average views per share link
3. **Conversion Rate**: % of share viewers who sign up for accounts
4. **Security Incidents**: Number of security incidents related to sharing
5. **User Satisfaction**: Feedback on sharing functionality

## Risks and Mitigation

### Technical Risks
1. **Security Vulnerabilities**: Share links could expose sensitive data
   - Mitigation: Thorough security review, content sanitization, access logging
2. **Performance Impact**: Public access could strain resources
   - Mitigation: Caching strategy, rate limiting, scalability planning
3. **Abuse Potential**: Share links could be used for spam or malicious content
   - Mitigation: Abuse reporting, manual review options, automated filtering

### User Experience Risks
1. **Accidental Sharing**: Users might share sensitive content unintentionally
   - Mitigation: Clear sharing confirmation, preview options, easy revocation
2. **Link Management Overhead**: Users may lose track of active shares
   - Mitigation: Clear management UI, expiration defaults, bulk operations

## Migration Plan

1. **Phase 1** (Weeks 1-2): Database and API foundation, no user impact
2. **Phase 2** (Weeks 3-4): Basic sharing features, opt-in for early adopters
3. **Phase 3** (Weeks 5-6): Advanced features and UI polish
4. **Phase 4** (Weeks 7-8): Security hardening and performance optimization

## Related Backlog Items

- `BACKLOG-004-pwa-support.md`: Shared notes should be available offline in PWA
- `BACKLOG-005-search-and-tags.md`: Consider if shared notes should be searchable

## Notes

1. Consider implementing "view once" links for highly sensitive content
2. Evaluate need for watermarking or download prevention
3. Consider integration with existing authentication for "share with specific users"
4. Privacy regulations (GDPR, CCPA) may require special handling for shared content