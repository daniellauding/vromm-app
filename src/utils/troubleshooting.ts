import { Alert } from 'react-native';
import { logInfo, logWarn, logError } from './logger';
import { createDiagnosticReport, detectMemoryIssues } from './timeoutHelper';

interface TroubleshootingIssue {
  id: string;
  title: string;
  symptoms: string[];
  causes: string[];
  solutions: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  category: 'performance' | 'network' | 'database' | 'ui' | 'crash' | 'memory';
}

export const COMMON_ISSUES: TroubleshootingIssue[] = [
  {
    id: 'app_crashes_startup',
    title: 'App Crashes on Startup',
    symptoms: [
      'App closes immediately after opening',
      'White screen then crash',
      'Error message on app launch',
      'App never reaches login screen',
    ],
    causes: [
      'Corrupted app data or cache',
      'Missing or corrupted database',
      'Configuration file issues',
      'Platform incompatibility',
      'Memory pressure on device',
      'Conflicting app installations',
    ],
    solutions: [
      'Force close and restart the app',
      'Clear app cache and data',
      'Restart device',
      'Uninstall and reinstall app',
      'Free up device storage',
      'Update device OS if needed',
      'Check device compatibility',
    ],
    urgency: 'critical',
    category: 'crash',
  },
  {
    id: 'login_failures',
    title: 'Login/Authentication Failures',
    symptoms: [
      'Login button does nothing',
      'Invalid credentials error with correct info',
      'Login takes forever then fails',
      'App logs out immediately after login',
    ],
    causes: [
      'Network connectivity issues',
      'Authentication server problems',
      'Cached credentials corruption',
      'Session token expired',
      'Local storage issues',
      'Firewall blocking auth requests',
    ],
    solutions: [
      'Check internet connection',
      'Try different network (WiFi vs cellular)',
      'Clear app data and login again',
      'Wait 5 minutes and try again',
      'Restart app completely',
      'Use forgot password to reset',
      'Contact support if issue persists',
    ],
    urgency: 'high',
    category: 'network',
  },
  {
    id: 'slow_performance',
    title: 'App Running Slowly',
    symptoms: [
      'Long loading times',
      'Delayed button responses',
      'Laggy scrolling',
      'Animations stuttering',
      'High battery usage',
    ],
    causes: [
      'High memory usage',
      'Too many background apps',
      'Poor network connection',
      'Database overload',
      'Device storage full',
      'Outdated device hardware',
    ],
    solutions: [
      'Close other apps to free memory',
      'Restart the app',
      'Free up device storage',
      'Connect to faster WiFi',
      'Clear app cache',
      'Restart device',
      'Update app to latest version',
    ],
    urgency: 'medium',
    category: 'performance',
  },
  {
    id: 'data_not_loading',
    title: 'Data Not Loading or Updating',
    symptoms: [
      'Empty screens where data should be',
      'Infinite loading spinners',
      'Old data not refreshing',
      'Error messages about server',
    ],
    causes: [
      'Network connectivity issues',
      'Server maintenance or downtime',
      'Database connection problems',
      'API rate limiting',
      'Cached data corruption',
      'Session expired',
    ],
    solutions: [
      'Pull down to refresh manually',
      'Check internet connection',
      'Try again in a few minutes',
      'Log out and log back in',
      'Clear app cache',
      'Switch between WiFi and cellular',
      'Contact support if widespread',
    ],
    urgency: 'medium',
    category: 'database',
  },
  {
    id: 'image_upload_fails',
    title: 'Image/Avatar Upload Failures',
    symptoms: [
      'Upload progress stuck',
      'Upload fails with error',
      'Images appear corrupted',
      'Upload takes extremely long',
    ],
    causes: [
      'Large file size',
      'Poor upload bandwidth',
      'Storage service issues',
      'File format not supported',
      'Insufficient storage space',
      'Network interruption',
    ],
    solutions: [
      'Reduce image size/quality',
      'Try uploading on WiFi',
      'Check available storage space',
      'Use different image format (JPG)',
      'Restart app and try again',
      'Take new photo instead of gallery',
      'Wait for better network conditions',
    ],
    urgency: 'low',
    category: 'network',
  },
  {
    id: 'location_not_working',
    title: 'Location Services Not Working',
    symptoms: [
      'Cannot detect current location',
      'Location permission denied',
      'GPS takes forever to find location',
      'Inaccurate location detected',
    ],
    causes: [
      'Location permissions disabled',
      'GPS signal weak or blocked',
      'Location services turned off',
      'Battery optimization affecting GPS',
      'Indoor location with poor signal',
      'Cold GPS start',
    ],
    solutions: [
      'Enable location permissions for app',
      'Turn on device location services',
      'Go outdoors for better GPS signal',
      'Wait longer for GPS to acquire signal',
      'Restart app with location enabled',
      'Disable battery optimization for app',
      'Manually enter location if needed',
    ],
    urgency: 'medium',
    category: 'ui',
  },
  {
    id: 'white_screen_crash',
    title: 'White Screen or Blank App',
    symptoms: [
      'App shows white/blank screen',
      'No UI elements visible',
      'App appears frozen',
      'Nothing responds to touch',
    ],
    causes: [
      'JavaScript runtime error',
      'Memory exhaustion',
      'Component rendering failure',
      'Navigation state corruption',
      'Database connection lost',
      'Critical dependency missing',
    ],
    solutions: [
      'Force close and restart app',
      'Restart device',
      'Clear app cache and data',
      'Free up device memory',
      'Update app if available',
      'Uninstall and reinstall app',
      'Wait and try again later',
    ],
    urgency: 'high',
    category: 'crash',
  },
  {
    id: 'memory_warnings',
    title: 'Memory Pressure/Warnings',
    symptoms: [
      'App becomes slow over time',
      'Other apps get killed',
      'Device becomes unresponsive',
      'Frequent app crashes',
      'Battery drains quickly',
    ],
    causes: [
      'Memory leaks in app',
      'Too many large images in memory',
      'Background processes consuming memory',
      'Insufficient device RAM',
      'Other apps using too much memory',
      'Cache not being cleared properly',
    ],
    solutions: [
      'Restart the app regularly',
      'Close other running apps',
      'Clear app cache frequently',
      'Restart device daily',
      'Avoid opening too many screens',
      'Use lower quality images',
      'Report issue if persistent',
    ],
    urgency: 'medium',
    category: 'memory',
  },
];

interface DiagnosticResult {
  detectedIssues: TroubleshootingIssue[];
  recommendations: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  diagnosticReport: any;
}

/**
 * Analyze current app state and provide troubleshooting recommendations
 */
export function diagnosePotentialIssues(context: string): DiagnosticResult {
  const diagnosticReport = createDiagnosticReport(context);
  const detectedIssues: TroubleshootingIssue[] = [];
  const recommendations: string[] = [];
  
  // Check for memory issues
  const hasMemoryIssue = detectMemoryIssues(context);
  if (hasMemoryIssue) {
    detectedIssues.push(COMMON_ISSUES.find(issue => issue.id === 'memory_warnings')!);
    recommendations.push('High memory usage detected - consider restarting app');
  }

  // Check platform-specific issues
  const platform = diagnosticReport.platform.OS;
  if (platform === 'android') {
    recommendations.push('Android detected - monitor for cache issues');
  } else if (platform === 'ios') {
    recommendations.push('iOS detected - check background app refresh settings');
  }

  // Determine overall urgency
  const urgencies = detectedIssues.map(issue => issue.urgency);
  const maxUrgency = urgencies.includes('critical') ? 'critical' :
                    urgencies.includes('high') ? 'high' :
                    urgencies.includes('medium') ? 'medium' : 'low';

  // Add general recommendations
  if (recommendations.length === 0) {
    recommendations.push('System appears to be running normally');
    recommendations.push('Continue monitoring for any issues');
  }

  logInfo('Diagnostic analysis completed', {
    context,
    detectedIssues: detectedIssues.length,
    urgency: maxUrgency,
    recommendations: recommendations.length,
  });

  return {
    detectedIssues,
    recommendations,
    urgency: maxUrgency,
    diagnosticReport,
  };
}

/**
 * Find potential solutions for specific symptoms
 */
export function findSolutionsForSymptoms(symptoms: string[]): TroubleshootingIssue[] {
  const matchedIssues: TroubleshootingIssue[] = [];
  
  for (const issue of COMMON_ISSUES) {
    const matchCount = symptoms.filter(symptom => 
      issue.symptoms.some(issueSymptom => 
        issueSymptom.toLowerCase().includes(symptom.toLowerCase()) ||
        symptom.toLowerCase().includes(issueSymptom.toLowerCase())
      )
    ).length;
    
    if (matchCount > 0) {
      matchedIssues.push(issue);
    }
  }
  
  // Sort by relevance (most matching symptoms first)
  matchedIssues.sort((a, b) => {
    const aMatches = symptoms.filter(symptom => 
      a.symptoms.some(issueSymptom => 
        issueSymptom.toLowerCase().includes(symptom.toLowerCase())
      )
    ).length;
    
    const bMatches = symptoms.filter(symptom => 
      b.symptoms.some(issueSymptom => 
        issueSymptom.toLowerCase().includes(symptom.toLowerCase())
      )
    ).length;
    
    return bMatches - aMatches;
  });
  
  return matchedIssues;
}

/**
 * Show troubleshooting dialog with solutions
 */
export function showTroubleshootingDialog(
  title: string, 
  symptoms: string[], 
  context: string = 'Unknown'
) {
  const matchedIssues = findSolutionsForSymptoms(symptoms);
  const diagnostic = diagnosePotentialIssues(context);
  
  if (matchedIssues.length === 0) {
    Alert.alert(
      'Troubleshooting',
      'No specific solutions found for the reported symptoms. Try these general steps:\n\n' +
      '• Restart the app\n' +
      '• Check internet connection\n' +
      '• Free up device storage\n' +
      '• Contact support if issue persists'
    );
    return;
  }
  
  const topIssue = matchedIssues[0];
  const solutions = topIssue.solutions.slice(0, 5); // Show top 5 solutions
  
  Alert.alert(
    `Troubleshooting: ${topIssue.title}`,
    `Possible solutions:\n\n${solutions.map((solution, index) => 
      `${index + 1}. ${solution}`
    ).join('\n')}\n\nUrgency: ${topIssue.urgency.toUpperCase()}`,
    [
      { text: 'Got It', style: 'default' },
      { 
        text: 'More Info', 
        style: 'default',
        onPress: () => showDetailedTroubleshooting(topIssue, diagnostic)
      }
    ]
  );
}

/**
 * Show detailed troubleshooting information
 */
function showDetailedTroubleshooting(issue: TroubleshootingIssue, diagnostic: DiagnosticResult) {
  Alert.alert(
    `Detailed: ${issue.title}`,
    `SYMPTOMS:\n${issue.symptoms.join('\n')}\n\n` +
    `POSSIBLE CAUSES:\n${issue.causes.join('\n')}\n\n` +
    `ALL SOLUTIONS:\n${issue.solutions.map((sol, i) => `${i + 1}. ${sol}`).join('\n')}\n\n` +
    `SYSTEM STATUS:\n${diagnostic.recommendations.join('\n')}`,
    [{ text: 'Close' }]
  );
}

/**
 * Quick health check with immediate feedback
 */
export async function performQuickHealthCheck(context: string = 'HealthCheck'): Promise<void> {
  try {
    logInfo('Starting quick health check', { context });
    
    const diagnostic = diagnosePotentialIssues(context);
    const hasMemoryIssue = detectMemoryIssues(context);
    
    let status = '✅ All systems appear normal';
    let details = 'No issues detected';
    
    if (diagnostic.urgency === 'critical') {
      status = '🚨 CRITICAL ISSUES DETECTED';
      details = 'Immediate action required';
    } else if (diagnostic.urgency === 'high') {
      status = '⚠️ High priority issues found';
      details = 'Address these issues soon';
    } else if (diagnostic.urgency === 'medium' || hasMemoryIssue) {
      status = '⚠️ Some issues detected';
      details = 'Minor optimizations recommended';
    }
    
    Alert.alert(
      'Health Check Results',
      `${status}\n\n${details}\n\nRecommendations:\n${diagnostic.recommendations.slice(0, 3).join('\n')}`,
      [
        { text: 'OK' },
        { 
          text: 'View Details', 
          onPress: () => {
            Alert.alert(
              'Detailed Health Report',
              `Platform: ${diagnostic.diagnosticReport.platform.OS}\n` +
              `Memory: ${diagnostic.diagnosticReport.memory.usage || 'N/A'}\n` +
              `Issues Found: ${diagnostic.detectedIssues.length}\n` +
              `Urgency: ${diagnostic.urgency}\n\n` +
              `All Recommendations:\n${diagnostic.recommendations.join('\n')}`
            );
          }
        }
      ]
    );
    
  } catch (error) {
    logError('Health check failed', error as Error);
    Alert.alert(
      'Health Check Failed',
      'Unable to complete health check. This might indicate a serious issue. Try restarting the app.'
    );
  }
}

/**
 * Emergency recovery procedures for critical issues
 */
export function initiateEmergencyRecovery(issueType: string = 'unknown') {
  logWarn(`Emergency recovery initiated for: ${issueType}`);
  
  Alert.alert(
    'Emergency Recovery',
    'Critical issue detected. Follow these steps in order:\n\n' +
    '1. Force close the app completely\n' +
    '2. Wait 30 seconds\n' +
    '3. Restart the app\n' +
    '4. If still failing, restart your device\n' +
    '5. If problem persists, contact support',
    [
      { text: 'Got It' },
      { 
        text: 'Contact Support',
        onPress: () => {
          // This would typically open a support channel
          Alert.alert('Support', 'Please contact our support team with error details.');
        }
      }
    ]
  );
}

/**
 * Export troubleshooting utilities for use in components
 */
export const troubleshootingUtils = {
  diagnosePotentialIssues,
  findSolutionsForSymptoms,
  showTroubleshootingDialog,
  performQuickHealthCheck,
  initiateEmergencyRecovery,
  COMMON_ISSUES,
}; 