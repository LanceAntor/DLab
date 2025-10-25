// YouTube Status Tracker
class YouTubeStatusTracker {
  constructor() {
    this.status = {
      lastSuccessfulDownload: null,
      lastSuccessfulInfo: null,
      consecutiveFailures: 0,
      totalAttempts: 0,
      successRate: 0,
      currentStatus: 'unknown', // 'working', 'limited', 'blocked', 'unknown'
      lastErrors: [],
      recommendations: []
    };
  }

  recordSuccess(type = 'info') {
    const now = Date.now();
    
    if (type === 'download') {
      this.status.lastSuccessfulDownload = now;
    } else {
      this.status.lastSuccessfulInfo = now;
    }
    
    this.status.consecutiveFailures = 0;
    this.status.totalAttempts++;
    this.updateSuccessRate();
    this.updateStatus();
  }

  recordFailure(error, type = 'info') {
    this.status.consecutiveFailures++;
    this.status.totalAttempts++;
    
    // Keep last 5 errors
    this.status.lastErrors.push({
      timestamp: Date.now(),
      error: error.message,
      type: type
    });
    
    if (this.status.lastErrors.length > 5) {
      this.status.lastErrors.shift();
    }
    
    this.updateSuccessRate();
    this.updateStatus();
  }

  updateSuccessRate() {
    if (this.status.totalAttempts > 0) {
      const successes = this.status.totalAttempts - this.status.consecutiveFailures;
      this.status.successRate = (successes / this.status.totalAttempts) * 100;
    }
  }

  updateStatus() {
    const { consecutiveFailures, successRate } = this.status;
    
    if (consecutiveFailures >= 5) {
      this.status.currentStatus = 'blocked';
      this.status.recommendations = [
        'YouTube is currently blocking all automated downloads',
        'This is temporary - try again in 1-2 hours',
        'Consider using YouTube Premium for offline downloads',
        'Try different videos or lower quality settings'
      ];
    } else if (consecutiveFailures >= 3 || successRate < 30) {
      this.status.currentStatus = 'limited';
      this.status.recommendations = [
        'YouTube downloads are partially working',
        'Try different videos if one fails',
        'Use lower quality settings (360p works better)',
        'Wait 15-30 minutes between attempts'
      ];
    } else if (successRate > 70) {
      this.status.currentStatus = 'working';
      this.status.recommendations = [
        'YouTube downloads are working normally',
        'Higher quality videos should work fine'
      ];
    } else {
      this.status.currentStatus = 'unknown';
      this.status.recommendations = [
        'YouTube download status is unclear',
        'Try a test download to check current status'
      ];
    }
  }

  isYouTubeAntiBotError(error) {
    const message = error.message.toLowerCase();
    return message.includes('parsing watch.html') ||
           message.includes('youtube made a change') ||
           message.includes('could not extract functions') ||
           message.includes('decipher function') ||
           message.includes('stream urls will be missing');
  }

  getStatusReport() {
    return {
      ...this.status,
      isBlocked: this.status.currentStatus === 'blocked',
      isWorking: this.status.currentStatus === 'working',
      timeSinceLastSuccess: this.status.lastSuccessfulDownload 
        ? Date.now() - this.status.lastSuccessfulDownload 
        : null,
      message: this.getStatusMessage()
    };
  }

  getStatusMessage() {
    switch (this.status.currentStatus) {
      case 'working':
        return 'YouTube downloads are working normally';
      case 'limited':
        return 'YouTube downloads are partially working - some videos may fail';
      case 'blocked':
        return 'YouTube has activated anti-bot protection - downloads are currently blocked';
      default:
        return 'YouTube download status unknown - testing needed';
    }
  }
}

export default YouTubeStatusTracker;