# SpotOn System - Frequently Asked Questions (FAQ)

## Table of Contents
1. [Getting Started](#getting-started)
2. [Person Detection and Tracking](#person-detection-and-tracking)
3. [Cross-Camera Re-identification](#cross-camera-re-identification)
4. [Map and Visualization](#map-and-visualization)
5. [Analytics and Reporting](#analytics-and-reporting)
6. [Technical Issues](#technical-issues)
7. [Privacy and Compliance](#privacy-and-compliance)
8. [Performance and Optimization](#performance-and-optimization)

---

## Getting Started

### Q: What browsers are supported?
**A:** SpotOn works best with modern browsers:
- **Chrome 90+** (Recommended)
- **Firefox 88+**
- **Safari 14+**
- **Edge 90+**

Older versions may work but aren't officially supported.

### Q: Do I need to install any software?
**A:** No installation required! SpotOn is a web-based application that runs entirely in your browser. Simply navigate to your SpotOn URL to get started.

### Q: What if I can't access the system?
**A:** Check these common solutions:
1. Verify you have the correct URL
2. Ensure your internet connection is stable
3. Try clearing your browser cache and cookies
4. Contact your IT administrator for access credentials
5. Check if your network firewall allows the connection

### Q: Why is the system asking me to select an environment?
**A:** SpotOn supports multiple monitoring locations. You need to choose which environment (Campus or Factory) you want to monitor. Each has different camera configurations and layouts.

### Q: Can I monitor multiple environments simultaneously?
**A:** Currently, you can only monitor one environment at a time. To switch environments, return to the selection page and choose a different option.

---

## Person Detection and Tracking

### Q: Why do some people not get detected?
**A:** Person detection can be affected by several factors:
- **Poor lighting conditions**: Very bright or very dark areas
- **Distance from camera**: People too far away appear too small
- **Occlusion**: Person partially hidden behind objects or other people
- **Camera angle**: Some angles make person detection more difficult
- **Clothing**: Certain patterns or colors may affect detection
- **Movement speed**: Very fast movement can cause blurring

### Q: What do the colored boxes around people mean?
**A:** The colored rectangles (bounding boxes) indicate:
- **Person Detection**: System has identified a human in that location
- **Unique Colors**: Each person gets a distinct color for identification
- **Tracking Continuity**: Same color follows the same person over time
- **Cross-Camera Consistency**: Same person keeps same color across different cameras

### Q: Why do the colors sometimes change?
**A:** Color changes can occur when:
- System loses track of a person and treats their reappearance as new
- Person exits camera view for extended period
- Detection confidence drops very low
- System restarts or resets tracking
This is normal behavior, though consistent color is the goal.

### Q: What are the numbers above people?
**A:** These are Person IDs - unique identifiers assigned to each detected person:
- **Local ID**: Specific to one camera (e.g., "Track_1")
- **Global ID**: Consistent across all cameras (e.g., "Person_15")
- **Temporary ID**: May change if tracking is lost and re-established

### Q: Why do confidence scores vary?
**A:** Confidence scores (0-100%) indicate how certain the system is about detection:
- **High (80-100%)**: Clear view, good lighting, distinct person
- **Medium (60-79%)**: Acceptable quality, minor issues
- **Low (40-59%)**: Poor conditions, partial occlusion, or unclear image
- **Very Low (<40%)**: Unreliable detection, may be false positive

### Q: Can I adjust the detection sensitivity?
**A:** Yes, in Settings → Detection, you can:
- Set minimum confidence thresholds
- Adjust per-camera sensitivity
- Configure detection parameters
- Balance quality vs. quantity of detections

---

## Cross-Camera Re-identification

### Q: How does cross-camera tracking work?
**A:** The system analyzes visual features to match people between cameras:
1. **Appearance Analysis**: Clothing color, patterns, body shape
2. **Temporal Logic**: Uses timing to validate matches
3. **Spatial Reasoning**: Considers camera positions and likely movement paths
4. **Feature Matching**: Compares extracted visual characteristics

### Q: Why doesn't the same person always get the same ID in different cameras?
**A:** Cross-camera re-identification can fail due to:
- **Lighting Differences**: Different illumination between camera locations
- **Camera Angles**: Different viewing angles change appearance
- **Clothing Changes**: Person removes/adds clothing (jacket, bag)
- **Time Gaps**: Long delays between camera appearances
- **Similar Appearance**: Multiple people with very similar clothing/build
- **System Load**: High processing load can reduce matching accuracy

### Q: How accurate is cross-camera tracking?
**A:** Accuracy varies based on conditions:
- **Ideal Conditions**: 85-95% accuracy with good lighting and distinct clothing
- **Typical Conditions**: 70-85% accuracy in normal environments
- **Challenging Conditions**: 50-70% accuracy with poor lighting or similar-dressed people
- **System Learning**: Accuracy improves over time as system learns environment patterns

### Q: What should I do if I notice incorrect matches?
**A:** You can help improve the system:
1. **Document Issues**: Note specific examples of incorrect matches
2. **Report Patterns**: If certain conditions consistently cause problems
3. **Provide Feedback**: Contact administrators with detailed examples
4. **Manual Verification**: Use multiple visual cues to confirm person identity

### Q: Can I manually correct tracking errors?
**A:** Manual correction features depend on your system configuration:
- Some versions allow manual ID assignment
- Others provide feedback mechanisms for system learning
- Contact your administrator about available correction tools

---

## Map and Visualization

### Q: Why don't people appear on the map?
**A:** People may not appear on the map if:
- **Coordinate Mapping**: Camera-to-map coordinate transformation not configured
- **Tracking Quality**: Person detection confidence below map display threshold
- **Map Calibration**: Calibration between camera views and map coordinates incorrect
- **Processing Delay**: Normal delay between detection and map position update
- **System Configuration**: Map features not enabled for your environment

### Q: How accurate are the positions on the map?
**A:** Position accuracy depends on:
- **Calibration Quality**: How well cameras are calibrated to map coordinates
- **Camera Height/Angle**: Better accuracy with optimal camera positioning
- **Environment Layout**: More complex layouts may have reduced accuracy
- **Typical Accuracy**: Usually within 1-2 meters in well-calibrated systems

### Q: Why do person paths look jagged or unrealistic?
**A:** Path visualization issues can result from:
- **Processing Frequency**: Low update rates create choppy paths
- **Detection Gaps**: Missed detections create path discontinuities
- **Coordinate Precision**: Limited precision in position calculations
- **Smoothing Settings**: Path smoothing algorithms may be disabled
You can often improve this in Settings → Map → Path Smoothing

### Q: Can I customize the map display?
**A:** Yes, typical customization options include:
- **Zoom Levels**: Adjust default and maximum zoom
- **Marker Styles**: Change person marker appearance
- **Path Display**: Configure path colors, thickness, and duration
- **Camera Icons**: Customize camera position indicators
- **Background**: Some systems allow custom map backgrounds

### Q: What do the different colors on the heatmap mean?
**A:** Heatmap colors indicate activity density:
- **Blue/Cold Colors**: Low activity areas
- **Green**: Moderate activity
- **Yellow/Orange**: High activity
- **Red/Hot Colors**: Very high activity or bottlenecks
- **Intensity Scale**: Usually configurable to match your needs

---

## Analytics and Reporting

### Q: How far back can I access historical data?
**A:** Data retention varies by system configuration:
- **Typical Retention**: 30-90 days of detailed tracking data
- **Summarized Data**: Longer retention of aggregated statistics
- **System Policy**: Check with your administrator for specific retention periods
- **Export Requirement**: Export important data before automatic deletion

### Q: Why don't my analytics match what I observe?
**A:** Discrepancies can occur due to:
- **Detection Accuracy**: False positives/negatives affect counts
- **Time Aggregation**: Data summarized over time periods may smooth out details
- **Filtering**: Analytics may apply confidence thresholds you're not seeing in live view
- **Processing Delays**: Analytics calculated after data collection with different parameters

### Q: Can I export analytics data?
**A:** Most systems support data export:
- **Format Options**: CSV, Excel, JSON, PDF reports
- **Time Ranges**: Custom date/time range selection
- **Data Types**: Raw tracking data, aggregated statistics, or visualizations
- **Access Requirements**: May require specific user permissions

### Q: How often are analytics updated?
**A:** Update frequency varies:
- **Real-time Displays**: Updated every few seconds
- **Historical Analytics**: Updated hourly or daily
- **Complex Reports**: May be generated on-demand
- **Scheduled Reports**: Updated according to configured schedules

### Q: What's the difference between person counts and detection counts?
**A:** Important distinction:
- **Person Counts**: Unique individuals (attempts to avoid double-counting)
- **Detection Counts**: Total number of detections (may count same person multiple times)
- **Cross-Camera Counting**: Person counts try to avoid counting same person in multiple cameras
- **Use Cases**: Person counts for occupancy, detection counts for system performance

---

## Technical Issues

### Q: The video feeds are not loading. What should I do?
**A:** Try these troubleshooting steps:
1. **Refresh the page** (F5 or Ctrl+R)
2. **Check internet connection** - test other websites
3. **Clear browser cache** - Settings → Clear browsing data
4. **Try different browser** - test with Chrome or Firefox
5. **Disable browser extensions** - especially ad blockers
6. **Contact IT support** if issues persist

### Q: Why is the system running slowly?
**A:** Performance issues can be caused by:
- **Browser Resources**: Close unnecessary tabs and applications
- **Internet Speed**: Slow connection affects video streaming
- **System Load**: High server load during peak usage times
- **Browser Version**: Update to latest browser version
- **Hardware**: Older computers may struggle with video processing

### Q: I'm getting "Connection Lost" messages frequently
**A:** Frequent disconnections suggest:
- **Network Instability**: Intermittent internet connection
- **Firewall Issues**: Corporate firewall blocking connections
- **VPN Problems**: VPN connection instability
- **Server Issues**: Backend server experiencing problems
- **Browser Settings**: Browser blocking certain connection types

### Q: The map is not displaying correctly
**A:** Map display issues often relate to:
- **Browser Compatibility**: Some browsers handle maps differently
- **JavaScript Errors**: Check browser console for error messages
- **Cache Issues**: Clear browser cache and reload
- **Configuration Problems**: Map coordinates not properly configured
- **Network Blocks**: Some corporate networks block map tile services

### Q: Why do I see "Camera Unavailable" messages?
**A:** Camera unavailability can result from:
- **Camera Hardware**: Physical camera problems or maintenance
- **Network Issues**: Connection problems between camera and server
- **Server Processing**: Backend processing errors
- **Configuration Changes**: Camera configuration being updated
- **Temporary Outages**: Usually resolves automatically

---

## Privacy and Compliance

### Q: What personal information does SpotOn collect?
**A:** SpotOn is designed for privacy protection:
- **No Facial Recognition**: System does not identify specific individuals
- **Anonymous Tracking**: People tracked using temporary, anonymous IDs
- **No Personal Data**: No names, ages, or identifying information collected
- **Visual Features**: Only clothing/appearance patterns for tracking purposes
- **Aggregate Analytics**: Focus on crowd patterns, not individual behavior

### Q: How long is tracking data stored?
**A:** Data retention varies by configuration:
- **Live Tracking**: Real-time data may not be permanently stored
- **Historical Data**: Typically 30-90 days, configurable by organization
- **Analytics Data**: Aggregated statistics may be kept longer
- **Legal Requirements**: Retention may be governed by local privacy laws
- **Purge Procedures**: Automatic deletion after retention period

### Q: Can individuals be identified from the tracking data?
**A:** SpotOn is designed to prevent individual identification:
- **Anonymous IDs**: Person IDs are temporary and not linked to identity
- **No Biometric Data**: No facial recognition or biometric identification
- **Pattern-Based**: Tracking based on clothing and movement patterns
- **Privacy by Design**: System architecture prioritizes anonymity
- **Data Minimization**: Only necessary data for tracking purposes collected

### Q: Who has access to the tracking data?
**A:** Access control is typically managed by:
- **Role-Based Access**: Different user roles have different permissions
- **Organizational Policy**: Access governed by organizational privacy policies
- **Audit Trails**: System logs who accesses what data and when
- **Administrator Controls**: System administrators can manage user access
- **Legal Compliance**: Access restrictions may be legally mandated

### Q: Can I opt out of being tracked?
**A:** Opt-out capabilities depend on:
- **System Configuration**: Some systems may offer opt-out mechanisms
- **Physical Avoidance**: Avoiding monitored areas is most effective
- **Legal Rights**: Local privacy laws may provide opt-out rights
- **Organizational Policy**: Check with facility management about policies
- **Anonymous Nature**: Since tracking is anonymous, opt-out may not be necessary

---

## Performance and Optimization

### Q: How can I improve system performance?
**A:** Performance optimization tips:
- **Browser**: Use Chrome or Firefox with latest updates
- **Hardware**: Ensure adequate RAM (8GB+) and modern processor
- **Network**: Stable broadband connection (10+ Mbps recommended)
- **Settings**: Reduce video quality in Settings if connection is slow
- **Background Apps**: Close unnecessary applications and browser tabs

### Q: What internet speed do I need?
**A:** Recommended internet speeds:
- **Minimum**: 5 Mbps for basic functionality
- **Recommended**: 10-25 Mbps for smooth operation
- **Multiple Users**: Add 5-10 Mbps per additional user
- **High Quality**: 25+ Mbps for maximum video quality
- **Upload Speed**: Important for sending commands and configuration changes

### Q: Can I use SpotOn on mobile devices?
**A:** Mobile support varies:
- **Tablets**: Generally well-supported with responsive design
- **Smartphones**: Basic functionality available, limited screen space
- **Touch Interface**: Optimized touch controls for mobile interaction
- **Performance**: May be slower on mobile due to processing limitations
- **Network**: Wi-Fi connection recommended over cellular

### Q: How many users can use the system simultaneously?
**A:** Concurrent user limits depend on:
- **Server Capacity**: Backend processing power and bandwidth
- **Network Infrastructure**: Available bandwidth for multiple streams
- **System Configuration**: May be configured with specific user limits
- **Performance Impact**: More users may reduce individual performance
- **Typical Limits**: Often 5-20 concurrent users depending on setup

### Q: Why do some features work slowly?
**A:** Feature performance varies based on:
- **Complexity**: More complex features (analytics, heatmaps) require more processing
- **Data Volume**: Large amounts of historical data take longer to process
- **Server Load**: Peak usage times may slow all features
- **Browser Resources**: Limited browser memory/CPU affects performance
- **Network Latency**: Distance from servers affects response times

---

## Additional Support

### Q: How do I get additional training?
**A:** Training options typically include:
- **Documentation**: Comprehensive user manual and tutorials
- **Video Tutorials**: Step-by-step feature demonstrations
- **Live Training**: Sessions with system administrators or vendors
- **Peer Learning**: Learn from other users in your organization
- **Support Tickets**: Contact technical support for specific questions

### Q: Who do I contact for technical problems?
**A:** Support channels usually include:
- **IT Department**: First point of contact for most organizations
- **System Administrator**: Person responsible for SpotOn in your organization
- **Vendor Support**: Direct support from SpotOn system provider
- **User Community**: Other users who may have experienced similar issues
- **Documentation**: Check user manual and FAQ first

### Q: How do I request new features?
**A:** Feature requests can be submitted through:
- **Feedback Forms**: Built-in feedback mechanisms in the system
- **Administrator**: Request through your local system administrator
- **Vendor Contact**: Direct communication with system provider
- **User Groups**: Collective feedback from user communities
- **Support Tickets**: Formal feature request through support channels

### Q: Can the system be customized for our specific needs?
**A:** Customization options vary:
- **Configuration**: Many features can be configured without custom development
- **User Interface**: Some systems allow UI customization
- **Analytics**: Custom reports and metrics may be available
- **Integration**: APIs for connecting with other systems
- **Professional Services**: Vendor may offer custom development services

---

**Still have questions?** Contact your system administrator or technical support team for additional assistance specific to your SpotOn installation and organizational policies.