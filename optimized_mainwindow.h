#ifndef OPTIMIZED_MAINWINDOW_H
#define OPTIMIZED_MAINWINDOW_H

#include <QApplication>
#include <QMainWindow>
#include <QProcess>
#include <QDebug>
#include <QTimer>
#include <QNetworkAccessManager>
#include <QNetworkRequest>
#include <QNetworkReply>
#include <QDialog>
#include <QMovie>
#include <QLabel>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QMessageBox>
#include <QScreen>
#include <QGuiApplication>
#include <QThread>
#include <QMutex>
#include <QCache>
#include <QPixmap>

#include "loadingscreen.h"
#include "deckgridview.h"

// Forward declarations for optimization classes
class ServerManager;
class ResourceCache;
class PerformanceMonitor;

class OptimizedMainWindow : public QMainWindow
{
    Q_OBJECT

public:
    explicit OptimizedMainWindow(QWidget *parent = nullptr);
    ~OptimizedMainWindow();

private slots:
    void onDeckSelected(const QString& deckId);
    void onCreateDeckClicked();
    void onSettingsClicked();
    void onServerReady();
    void onServerError(const QString& error);
    void onPerformanceUpdate(const QVariantMap& stats);

private:
    void setupOptimizedUI();
    void initializePerformanceMonitoring();
    void preloadResources();
    void optimizeMemoryUsage();
    
    // Server management
    ServerManager *serverManager;
    
    // Performance optimization components
    ResourceCache *resourceCache;
    PerformanceMonitor *performanceMonitor;
    
    // UI components
    DeckGridView *deckGridView;
    LoadingScreen *startupScreen;
    LoadingScreen *shutdownScreen;
    
    // Performance tracking
    QTimer *performanceTimer;
    QMutex performanceMutex;
    
    // Resource management
    QCache<QString, QPixmap> imageCache;
    QString animationPath;
    
    // Optimization flags
    bool resourcesPreloaded;
    bool performanceMonitoringEnabled;
};

/**
 * Optimized server management class that handles server lifecycle
 * with improved error handling and resource management.
 */
class ServerManager : public QObject
{
    Q_OBJECT

public:
    enum ServerState {
        Stopped,
        Starting,
        Running,
        Stopping,
        Error
    };

    explicit ServerManager(QObject *parent = nullptr);
    ~ServerManager();

    void startServer();
    void stopServer();
    ServerState getState() const { return currentState; }
    
    // Performance optimizations
    void setHealthCheckInterval(int milliseconds);
    void setStartupTimeout(int seconds);

signals:
    void serverReady();
    void serverError(const QString& error);
    void stateChanged(ServerState newState);

private slots:
    void checkServerHealth();
    void onProcessStarted();
    void onProcessFinished(int exitCode, QProcess::ExitStatus exitStatus);
    void onProcessError(QProcess::ProcessError error);
    void onHealthCheckReply();

private:
    void setState(ServerState newState);
    QString findServerScript();
    QString determineWorkingDirectory();
    void cleanupProcess();
    
    QProcess *serverProcess;
    QNetworkAccessManager *networkManager;
    QTimer *healthCheckTimer;
    
    ServerState currentState;
    int retryCount;
    int maxRetries;
    int healthCheckInterval;
    int startupTimeout;
    
    // Optimization: Cache paths to avoid repeated filesystem operations
    QString cachedServerScript;
    QString cachedWorkingDirectory;
    bool pathsCached;
};

/**
 * Resource cache for optimizing image and animation loading.
 */
class ResourceCache : public QObject
{
    Q_OBJECT

public:
    explicit ResourceCache(QObject *parent = nullptr);
    ~ResourceCache();

    // Image caching
    QPixmap getImage(const QString& path);
    void preloadImage(const QString& path);
    void clearImageCache();
    
    // Animation caching
    QMovie* getAnimation(const QString& path);
    void preloadAnimation(const QString& path);
    void clearAnimationCache();
    
    // Cache management
    void setCacheSize(int maxSizeMB);
    int getCacheSize() const;
    void clearAllCaches();
    
    // Statistics
    int getHitCount() const { return hitCount; }
    int getMissCount() const { return missCount; }
    double getHitRatio() const;

private:
    void updateCacheStats(bool hit);
    
    QCache<QString, QPixmap> imageCache;
    QCache<QString, QMovie> animationCache;
    
    int maxCacheSizeMB;
    int hitCount;
    int missCount;
    
    mutable QMutex cacheMutex;
};

/**
 * Performance monitoring class for tracking application performance.
 */
class PerformanceMonitor : public QObject
{
    Q_OBJECT

public:
    explicit PerformanceMonitor(QObject *parent = nullptr);
    ~PerformanceMonitor();

    void startMonitoring();
    void stopMonitoring();
    
    // Performance metrics
    void recordOperation(const QString& operation, qint64 durationMs);
    void recordMemoryUsage();
    void recordNetworkOperation(const QString& operation, qint64 bytes, qint64 durationMs);
    
    // Configuration
    void setMonitoringInterval(int milliseconds);
    void setMemoryThreshold(int percentThreshold);

signals:
    void performanceUpdate(const QVariantMap& stats);
    void memoryWarning(int currentPercent);
    void slowOperation(const QString& operation, qint64 durationMs);

private slots:
    void collectPerformanceData();

private:
    struct OperationStats {
        qint64 totalDuration;
        int count;
        qint64 maxDuration;
        qint64 minDuration;
    };
    
    QTimer *monitoringTimer;
    QMap<QString, OperationStats> operationStats;
    
    int monitoringInterval;
    int memoryThreshold;
    bool isMonitoring;
    
    // Performance data
    QList<qint64> memoryUsageHistory;
    QList<qint64> cpuUsageHistory;
    
    mutable QMutex statsMutex;
    
    // Helper methods
    qint64 getCurrentMemoryUsage();
    double getCurrentCpuUsage();
    void cleanupOldData();
};

#endif // OPTIMIZED_MAINWINDOW_H