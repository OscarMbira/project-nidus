# Troubleshooting Guide

## Common Issues and Solutions

This guide helps resolve common issues encountered when using Project Nidus.

## Authentication Issues

### Problem: Cannot log in

**Symptoms**:
- Login form not accepting credentials
- "Invalid credentials" error
- Redirect loop

**Solutions**:
1. Verify email and password are correct
2. Check if account is active
3. Clear browser cache and cookies
4. Try incognito/private browsing mode
5. Check browser console for errors
6. Contact administrator if issue persists

### Problem: Session expires frequently

**Symptoms**:
- Logged out unexpectedly
- "Session expired" messages

**Solutions**:
1. Check Supabase session timeout settings
2. Ensure browser allows cookies
3. Check if multiple tabs are open
4. Verify system time is correct
5. Contact administrator to adjust session settings

## Data Loading Issues

### Problem: Data not loading

**Symptoms**:
- Empty lists or dashboards
- Loading spinner never stops
- "Error loading data" messages

**Solutions**:
1. **Check Network Connection**:
   - Verify internet connection
   - Check if Supabase is accessible
   - Try refreshing the page

2. **Check Permissions**:
   - Verify you have access to the project
   - Check if RLS policies allow access
   - Contact administrator for permission issues

3. **Check Filters**:
   - Clear all filters
   - Reset search terms
   - Check date ranges

4. **Browser Console**:
   - Open browser developer tools (F12)
   - Check Console tab for errors
   - Look for network errors in Network tab

5. **Database Issues**:
   - Verify database connection
   - Check if tables exist
   - Contact administrator

### Problem: Slow data loading

**Symptoms**:
- Long wait times
- Timeout errors
- Browser becomes unresponsive

**Solutions**:
1. **Reduce Data Volume**:
   - Use filters to reduce results
   - Enable pagination
   - Limit date ranges

2. **Check Query Performance**:
   - Verify database indexes exist
   - Check query complexity
   - Contact administrator for query optimization

3. **Browser Performance**:
   - Close unnecessary tabs
   - Clear browser cache
   - Update browser to latest version

## Form Submission Issues

### Problem: Form not submitting

**Symptoms**:
- Submit button does nothing
- Form data not saving
- "Error saving" messages

**Solutions**:
1. **Validation Errors**:
   - Check for required fields
   - Verify field formats (dates, emails)
   - Look for error messages

2. **Network Issues**:
   - Check internet connection
   - Verify Supabase is accessible
   - Try again after a moment

3. **Permissions**:
   - Verify you have create/update permissions
   - Check RLS policies
   - Contact administrator

4. **Browser Console**:
   - Check for JavaScript errors
   - Look for API error messages
   - Verify form data is valid

### Problem: Form validation errors

**Symptoms**:
- Red error messages
- Fields highlighted in red
- Cannot submit form

**Solutions**:
1. **Required Fields**:
   - Fill in all required fields (marked with *)
   - Check field labels for requirements

2. **Field Formats**:
   - Dates: Use YYYY-MM-DD format
   - Emails: Use valid email format
   - Numbers: Use numeric values only

3. **Field Lengths**:
   - Check maximum length limits
   - Verify text is not too long

4. **Clear Errors**:
   - Fix validation errors
   - Form will allow submission when valid

## Display Issues

### Problem: Page not displaying correctly

**Symptoms**:
- Broken layout
- Missing elements
- Overlapping content

**Solutions**:
1. **Browser Compatibility**:
   - Use supported browser (Chrome, Firefox, Edge, Safari)
   - Update browser to latest version
   - Try different browser

2. **Screen Resolution**:
   - Check if responsive design issue
   - Try different window size
   - Zoom in/out (Ctrl/Cmd + +/-)

3. **Cache Issues**:
   - Clear browser cache
   - Hard refresh (Ctrl/Cmd + Shift + R)
   - Clear site data

4. **CSS Issues**:
   - Check if Tailwind CSS loaded
   - Verify no CSS conflicts
   - Check browser console for CSS errors

### Problem: Dark mode not working

**Symptoms**:
- Theme toggle not working
- Theme not persisting
- Inconsistent theme

**Solutions**:
1. **Toggle Button**:
   - Click theme toggle in navigation
   - Check if button is visible
   - Try refreshing page

2. **Browser Storage**:
   - Clear browser localStorage
   - Check if cookies are enabled
   - Try incognito mode

3. **System Preference**:
   - Check system dark mode setting
   - Verify browser respects system preference
   - Manually toggle theme

## Feature-Specific Issues

### Gantt Chart Issues

**Problem: Tasks not appearing**
- Verify tasks have valid start dates
- Check if tasks are filtered out
- Ensure tasks are assigned to project
- Refresh Gantt Chart

**Problem: Dependencies not showing**
- Verify dependencies are saved
- Check if both tasks are visible
- Verify dependency type is set
- Refresh page

**Problem: Timeline not updating**
- Refresh the page
- Check if dates are valid
- Verify task dates are in range
- Clear browser cache

### Kanban Board Issues

**Problem: Cards not moving**
- Check WIP limit on target column
- Verify permissions to move cards
- Refresh page and try again
- Check if card is locked

**Problem: WIP limit not working**
- Verify limit is set correctly
- Check if limit applies to your role
- Contact board administrator
- Refresh board

**Problem: Metrics not updating**
- Ensure cards have proper dates
- Check date ranges in metrics
- Refresh metrics dashboard
- Verify card status is correct

### Sprint Board Issues

**Problem: Burndown not updating**
- Verify story points are updated
- Check if items are marked complete
- Refresh burndown chart
- Verify sprint is active

**Problem: Sprint capacity exceeded**
- Review committed items
- Consider moving items to next sprint
- Adjust sprint duration
- Re-estimate items

### Issue Management Issues

**Problem: Issue not appearing**
- Check filters applied
- Verify project selection
- Refresh page
- Check permissions

**Problem: Cannot assign issue**
- Verify team member is project member
- Check permissions
- Refresh page
- Contact administrator

### Risk Management Issues

**Problem: Risk score not calculating**
- Verify probability and impact are set
- Check if values are 1-5
- Refresh page
- Re-enter values

**Problem: Heat map not displaying**
- Check if risks have probability/impact
- Verify risk data is complete
- Refresh page
- Check browser console for errors

## Performance Issues

### Problem: Application is slow

**Solutions**:
1. **Reduce Data**:
   - Use filters
   - Enable pagination
   - Limit visible items

2. **Browser Optimization**:
   - Close unnecessary tabs
   - Clear cache and cookies
   - Update browser

3. **Network**:
   - Check internet speed
   - Verify Supabase performance
   - Check for network issues

4. **Database**:
   - Contact administrator for query optimization
   - Check database performance
   - Verify indexes exist

### Problem: Memory issues

**Symptoms**:
- Browser becomes slow
- "Out of memory" errors
- Browser crashes

**Solutions**:
1. Close unnecessary tabs
2. Clear browser cache
3. Restart browser
4. Reduce data volume (use filters)
5. Contact administrator if persistent

## Browser-Specific Issues

### Chrome Issues

**Problem: Extensions interfering**
- Disable extensions one by one
- Use incognito mode (extensions disabled)
- Check extension settings

**Problem: Cache issues**
- Clear browsing data
- Hard refresh (Ctrl + Shift + R)
- Clear site data

### Firefox Issues

**Problem: Performance issues**
- Update Firefox
- Disable unnecessary extensions
- Clear cache and cookies

### Safari Issues

**Problem: Compatibility issues**
- Update Safari
- Enable JavaScript
- Clear cache

### Edge Issues

**Problem: Rendering issues**
- Update Edge
- Clear cache
- Try compatibility mode

## Getting Help

### Before Contacting Support

1. **Check This Guide**: Review relevant sections
2. **Check FAQ**: Review FAQ document
3. **Browser Console**: Check for error messages
4. **Network Tab**: Check for failed requests
5. **Clear Cache**: Try clearing browser cache
6. **Different Browser**: Try different browser
7. **Incognito Mode**: Test in incognito/private mode

### When Contacting Support

Provide the following information:
1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Step-by-step instructions
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Browser**: Browser name and version
6. **Screenshots**: Screenshots if applicable
7. **Console Errors**: Any error messages from browser console
8. **Network Errors**: Any failed network requests

### Support Channels

1. **Project Administrator**: Contact your project administrator
2. **System Administrator**: For system-wide issues
3. **Support Ticket**: Submit a support ticket
4. **Documentation**: Review user guides and documentation

## Prevention Tips

1. **Keep Browser Updated**: Use latest browser version
2. **Clear Cache Regularly**: Clear cache periodically
3. **Use Supported Browsers**: Stick to supported browsers
4. **Check Permissions**: Verify you have necessary permissions
5. **Report Issues Early**: Report issues as soon as noticed
6. **Follow Best Practices**: Follow user guide recommendations

---

*Last updated: January 2025*

