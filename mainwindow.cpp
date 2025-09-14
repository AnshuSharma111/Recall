#include "mainwindow.h"
#include "createdeckdialog.h"

#include <QProcess>
#include <QTimer>
#include <QNetworkAccessManager>
#include <QNetworkRequest>
#include <QNetworkReply>
#include <QUrl>
#include <QDebug>
#include <QApplication>
#include <QScreen>
#include <QGuiApplication>
#include <QDir>
#include <QCoreApplication>
#include <QFileInfo>
#include <QMessageBox>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QPushButton>
#include <QJsonDocument>
#include <QJsonObject>
#include <QThread>
#include <QMutexLocker>
#include <QStandardPaths>
#include <QFrame>
#include <QDateTime>

// ============================================================================
// MainWindow Implementation
// ============================================================================

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent),
    serverManager(nullptr),
    resourceCache(nullptr),
    performanceMonitor(nullptr),
    deckGridView(nullptr),
    startupScreen(nullptr),
    shutdownScreen(nullptr),
    performanceTimer(new QTimer(this)),
    imageCache(50), // Cache up to 50 images
    resourcesPreloaded(false),
    performanceMonitoringEnabled(true)
{
    // Initialize optimization components
    serverManager = new ServerManager(this);
    resourceCache = new ResourceCache(this);
    performanceMonitor = new PerformanceMonitor(this);
    
    // Connect server manager signals
    connect(serverManager, &ServerManager::serverReady, this, &MainWindow::onServerReady);
    connect(serverManager, &ServerManager::serverError, this, &MainWindow::onServerError);
    
    // Connect performance monitor
    connect(performanceMonitor, &PerformanceMonitor::performanceUpdate, 
            this, &MainWindow::onPerformanceUpdate);
    
    // Setup performance monitoring
    initializePerformanceMonitoring();
    
    // Preload resources in background
    QTimer::singleShot(0, this, &MainWindow::preloadResources);
    
    // Setup startup screen
    startupScreen = new LoadingScreen(LoadingScreen::Startup);
    
    // Set animation path immediately
    QString appDirPath = QCoreApplication::applicationDirPath();
    QStringList possibleDirs;
    possibleDirs << appDirPath + "/../../../static/images/"
                << "static/images/"
                << "../static/images/"
                << "../../static/images/"
                << appDirPath + "/static/images/";
    
    for (const QString &dir : possibleDirs) {
        QFileInfo loadingCheck(dir + "loading.gif");
        if (loadingCheck.exists()) {
            animationPath = dir + "loading.gif";
            startupScreen->setAnimationPath(animationPath);
            qDebug() << "Set startup animation path:" << animationPath;
            break;
        }
    }
    
    startupScreen->show();
    
    // Start server
    serverManager->startServer();
}

MainWindow::~MainWindow()
{
    qDebug() << "MainWindow destructor called - starting cleanup";
    
    // Show shutdown screen
    if (!shutdownScreen) {
        shutdownScreen = new LoadingScreen(LoadingScreen::Shutdown);
        
        // Set shutdown animation if available
        if (!animationPath.isEmpty()) {
            QString shutdownAnimPath = animationPath;
            shutdownAnimPath.replace("loading.gif", "shutdown.gif");
            
            if (QFileInfo(shutdownAnimPath).exists()) {
                shutdownScreen->setAnimationPath(shutdownAnimPath);
            } else {
                shutdownScreen->setAnimationPath(animationPath);
            }
        }
        
        shutdownScreen->show();
        shutdownScreen->startPhraseRotation();
        QApplication::processEvents();
    }
    
    // Stop performance monitoring
    if (performanceMonitor) {
        performanceMonitor->stopMonitoring();
        qDebug() << "Performance monitoring stopped";
    }
    
    // Stop server gracefully
    if (serverManager) {
        qDebug() << "Stopping server...";
        serverManager->stopServer();
        
        // Wait a bit for graceful shutdown
        QEventLoop loop;
        QTimer::singleShot(3000, &loop, &QEventLoop::quit);
        loop.exec();
        
        qDebug() << "Server stopped";
    }
    
    // Clear caches
    if (resourceCache) {
        resourceCache->clearAllCaches();
        qDebug() << "Caches cleared";
    }
    
    // Stop shutdown screen phrase rotation
    if (shutdownScreen) {
        shutdownScreen->stopPhraseRotation();
        QApplication::processEvents();
        
        // Wait a moment before closing
        QTimer::singleShot(1000, [this]() {
            if (shutdownScreen) {
                shutdownScreen->accept();
                shutdownScreen->deleteLater();
                shutdownScreen = nullptr;
            }
        });
    }
    
    qDebug() << "MainWindow cleanup completed";
}

void MainWindow::setupOptimizedUI()
{
    // Set window properties with optimized settings
    setWindowTitle("Recall - Flashcard Study App");
    resize(1024, 768);
    
    // Create central widget
    QWidget *centralWidget = new QWidget(this);
    setCentralWidget(centralWidget);
    
    // Create main layout
    QVBoxLayout *mainLayout = new QVBoxLayout(centralWidget);
    
    // Create header with cached resources
    QWidget *header = new QWidget(centralWidget);
    QHBoxLayout *headerLayout = new QHBoxLayout(header);
    
    QLabel *titleLabel = new QLabel("Recall", header);
    titleLabel->setObjectName("titleLabel");
    QFont titleFont = titleLabel->font();
    titleFont.setPointSize(28);
    titleFont.setBold(true);
    titleLabel->setFont(titleFont);
    
    QLabel *subtitleLabel = new QLabel("Your Flashcard Collection", header);
    subtitleLabel->setObjectName("subtitleLabel");
    QFont subtitleFont = subtitleLabel->font();
    subtitleFont.setPointSize(14);
    subtitleLabel->setFont(subtitleFont);
    
    // Add a divider between the title and subtitle
    QFrame *divider = new QFrame(header);
    divider->setFrameShape(QFrame::VLine);
    divider->setFrameShadow(QFrame::Sunken);
    divider->setStyleSheet("background-color: #BB86FC; margin: 0px 10px;");
    divider->setMaximumWidth(2);
    divider->setMinimumHeight(30);
    
    headerLayout->addWidget(titleLabel);
    headerLayout->addWidget(divider);
    headerLayout->addWidget(subtitleLabel);
    headerLayout->addStretch();
    headerLayout->setContentsMargins(20, 20, 20, 20);
    
    mainLayout->addWidget(header);
    
    // Create optimized deck grid view
    deckGridView = new DeckGridView(centralWidget);
    connect(deckGridView, &DeckGridView::deckSelected, this, &MainWindow::onDeckSelected);
    
    mainLayout->addWidget(deckGridView, 1);
    
    // Create button container
    QWidget *buttonContainer = new QWidget(centralWidget);
    QHBoxLayout *buttonLayout = new QHBoxLayout(buttonContainer);
    
    // Create Deck button
    QPushButton *createDeckButton = new QPushButton("Create Deck", buttonContainer);
    createDeckButton->setObjectName("createDeckButton");
    createDeckButton->setMinimumSize(150, 40);
    connect(createDeckButton, &QPushButton::clicked, this, &MainWindow::onCreateDeckClicked);
    
    // Settings button
    QPushButton *settingsButton = new QPushButton("Settings", buttonContainer);
    settingsButton->setObjectName("settingsButton");
    settingsButton->setMinimumSize(150, 40);
    connect(settingsButton, &QPushButton::clicked, this, &MainWindow::onSettingsClicked);
    
    buttonLayout->addWidget(createDeckButton);
    buttonLayout->addStretch();
    buttonLayout->addWidget(settingsButton);
    buttonLayout->setContentsMargins(20, 10, 20, 20);
    
    mainLayout->addWidget(buttonContainer);
    centralWidget->setLayout(mainLayout);
    
    // Apply optimized stylesheet
    setStyleSheet(
        "QMainWindow {"
        "   background-color: #121212;"
        "}"
        "QWidget {"
        "   background-color: #121212;"
        "   color: #FFFFFF;"
        "}"
        "QLabel#titleLabel {"
        "   color: #BB86FC;"
        "}"
        "QLabel#subtitleLabel {"
        "   color: #CCCCCC;"
        "}"
        "QPushButton {"
        "   background-color: #BB86FC;"
        "   color: #121212;"
        "   border: none;"
        "   border-radius: 4px;"
        "   padding: 8px 16px;"
        "   font-weight: bold;"
        "}"
        "QPushButton:hover {"
        "   background-color: #9969DA;"
        "}"
        "QPushButton:pressed {"
        "   background-color: #7F39FB;"
        "}"
    );
}

void MainWindow::initializePerformanceMonitoring()
{
    if (performanceMonitoringEnabled && performanceMonitor) {
        performanceMonitor->setMonitoringInterval(5000); // 5 seconds
        performanceMonitor->setMemoryThreshold(80); // 80% memory threshold
        performanceMonitor->startMonitoring();
        
        qDebug() << "Performance monitoring initialized";
    }
}

void MainWindow::preloadResources()
{
    if (resourcesPreloaded) {
        return;
    }
    
    qDebug() << "Preloading resources...";
    
    // Find and preload animations
    QString appDirPath = QCoreApplication::applicationDirPath();
    QStringList possibleDirs;
    possibleDirs << appDirPath + "/../../../static/images/"
                << "static/images/"
                << "../static/images/"
                << "../../static/images/"
                << appDirPath + "/static/images/";
    
    for (const QString &dir : possibleDirs) {
        QFileInfo loadingCheck(dir + "loading.gif");
        if (loadingCheck.exists()) {
            animationPath = dir + "loading.gif";
            
            // Preload animations
            resourceCache->preloadAnimation(animationPath);
            
            QString shutdownPath = dir + "shutdown.gif";
            if (QFileInfo(shutdownPath).exists()) {
                resourceCache->preloadAnimation(shutdownPath);
            }
            
            qDebug() << "Preloaded animations from:" << dir;
            break;
        }
    }
    
    resourcesPreloaded = true;
    qDebug() << "Resource preloading completed";
}

void MainWindow::optimizeMemoryUsage()
{
    QMutexLocker locker(&performanceMutex);
    
    // Clear unused caches
    resourceCache->clearImageCache();
    
    // Clear Qt's internal caches
    QPixmapCache::clear();
    
    // Force garbage collection in Qt
    QCoreApplication::processEvents();
    
    qDebug() << "Memory optimization completed";
}

void MainWindow::onServerReady()
{
    qDebug() << "Server is ready, setting up main UI";
    
    // Close startup screen
    if (startupScreen) {
        startupScreen->accept();
        startupScreen->deleteLater();
        startupScreen = nullptr;
    }
    
    // Setup main UI
    setupOptimizedUI();
    
    // Show main window
    show();
    
    // Load decks asynchronously
    if (deckGridView) {
        QTimer::singleShot(100, deckGridView, &DeckGridView::loadDecks);
    }
}

void MainWindow::onServerError(const QString& error)
{
    qDebug() << "Server error:" << error;
    
    if (startupScreen) {
        startupScreen->showErrorMessage("Server failed to start: " + error);
        QTimer::singleShot(3000, this, [this]() {
            QApplication::quit();
        });
    } else {
        QMessageBox::critical(this, "Server Error", 
                            "Server encountered an error: " + error);
    }
}

void MainWindow::onPerformanceUpdate(const QVariantMap& stats)
{
    // Log performance statistics
    if (stats.contains("memoryPercent")) {
        double memoryPercent = stats["memoryPercent"].toDouble();
        if (memoryPercent > 80.0) {
            qDebug() << "High memory usage detected:" << memoryPercent << "%";
            // Trigger memory optimization
            QTimer::singleShot(0, this, &MainWindow::optimizeMemoryUsage);
        }
    }
    
    // Update cache statistics
    if (resourceCache) {
        double hitRatio = resourceCache->getHitRatio();
        if (hitRatio < 0.5) { // Less than 50% hit ratio
            qDebug() << "Low cache hit ratio:" << hitRatio;
        }
    }
}

void MainWindow::onDeckSelected(const QString& deckId) {
    // For now, just show a message box with the selected deck ID
    QMessageBox::information(this, "Deck Selected", 
                            "You selected deck: " + deckId + "\n\n"
                            "Deck revision functionality will be implemented in a future update.");
}

void MainWindow::onCreateDeckClicked() {
    CreateDeckDialog dialog(this);
    
    if (dialog.exec() == QDialog::Accepted) {
        // Refresh the deck grid to show the new deck
        if (deckGridView) {
            deckGridView->loadDecks();
        }
    }
}

void MainWindow::onSettingsClicked() {
    QMessageBox::information(this, "Settings", 
                           "Settings functionality will be implemented in a future update.");
}

void MainWindow::cleanupAndExit()
{
    qDebug() << "cleanupAndExit called";
    
    // Show shutdown screen with proper animation
    if (!shutdownScreen) {
        shutdownScreen = new LoadingScreen(LoadingScreen::Shutdown);
        
        // Set shutdown animation
        if (!animationPath.isEmpty()) {
            QString shutdownAnimPath = animationPath;
            shutdownAnimPath.replace("loading.gif", "shutdown.gif");
            
            if (QFileInfo(shutdownAnimPath).exists()) {
                shutdownScreen->setAnimationPath(shutdownAnimPath);
                qDebug() << "Using shutdown animation:" << shutdownAnimPath;
            } else {
                shutdownScreen->setAnimationPath(animationPath);
                qDebug() << "Using loading animation for shutdown:" << animationPath;
            }
        }
        
        shutdownScreen->show();
        shutdownScreen->startPhraseRotation();
        QApplication::processEvents();
    }
    
    // Stop performance monitoring
    if (performanceMonitor) {
        performanceMonitor->stopMonitoring();
        qDebug() << "Performance monitoring stopped";
    }
    
    // Stop server gracefully
    if (serverManager) {
        qDebug() << "Requesting server shutdown...";
        serverManager->stopServer();
        
        // Wait for server to stop
        QEventLoop loop;
        QTimer timeoutTimer;
        timeoutTimer.setSingleShot(true);
        
        connect(serverManager, &ServerManager::stateChanged, [&](ServerManager::ServerState state) {
            if (state == ServerManager::Stopped) {
                qDebug() << "Server stopped successfully";
                loop.quit();
            }
        });
        
        connect(&timeoutTimer, &QTimer::timeout, [&]() {
            qDebug() << "Server shutdown timeout - forcing exit";
            loop.quit();
        });
        
        timeoutTimer.start(5000); // 5 second timeout
        loop.exec();
    }
    
    // Clear caches
    if (resourceCache) {
        resourceCache->clearAllCaches();
        qDebug() << "Caches cleared";
    }
    
    // Close shutdown screen and exit
    if (shutdownScreen) {
        shutdownScreen->stopPhraseRotation();
        QApplication::processEvents();
        
        QTimer::singleShot(1000, []() {
            qDebug() << "Exiting application";
            QApplication::quit();
        });
    } else {
        QApplication::quit();
    }
}

// ============================================================================
// ServerManager Implementation
// ============================================================================

ServerManager::ServerManager(QObject *parent)
    : QObject(parent),
    serverProcess(nullptr),
    networkManager(new QNetworkAccessManager(this)),
    healthCheckTimer(new QTimer(this)),
    currentState(Stopped),
    retryCount(0),
    maxRetries(30),
    healthCheckInterval(10000), // 10 seconds
    startupTimeout(60), // 60 seconds
    pathsCached(false)
{
    connect(healthCheckTimer, &QTimer::timeout, this, &ServerManager::checkServerHealth);
}

ServerManager::~ServerManager()
{
    stopServer();
}

void ServerManager::startServer()
{
    if (currentState == Starting || currentState == Running) {
        return;
    }
    
    setState(Starting);
    retryCount = 0;
    
    // Cache paths if not already done
    if (!pathsCached) {
        cachedServerScript = findServerScript();
        cachedWorkingDirectory = determineWorkingDirectory();
        pathsCached = true;
    }
    
    // Create and configure process
    if (serverProcess) {
        cleanupProcess();
    }
    
    serverProcess = new QProcess(this);
    connect(serverProcess, &QProcess::started, this, &ServerManager::onProcessStarted);
    connect(serverProcess, QOverload<int, QProcess::ExitStatus>::of(&QProcess::finished),
            this, &ServerManager::onProcessFinished);
    connect(serverProcess, &QProcess::errorOccurred, this, &ServerManager::onProcessError);
    
    // Set working directory and start process
    serverProcess->setWorkingDirectory(cachedWorkingDirectory);
    serverProcess->start("python", QStringList() << cachedServerScript);
    
    if (!serverProcess->waitForStarted(5000)) {
        setState(Error);
        emit serverError("Failed to start server process");
        return;
    }
    
    qDebug() << "Server process started, beginning health checks";
}

void ServerManager::stopServer()
{
    if (currentState == Stopped || currentState == Stopping) {
        return;
    }
    
    setState(Stopping);
    healthCheckTimer->stop();
    
    if (serverProcess && serverProcess->state() != QProcess::NotRunning) {
        serverProcess->terminate();
        
        if (!serverProcess->waitForFinished(10000)) {
            serverProcess->kill();
            serverProcess->waitForFinished(3000);
        }
    }
    
    cleanupProcess();
    setState(Stopped);
}

void ServerManager::setHealthCheckInterval(int milliseconds)
{
    healthCheckInterval = milliseconds;
    if (healthCheckTimer->isActive()) {
        healthCheckTimer->setInterval(milliseconds);
    }
}

void ServerManager::setStartupTimeout(int seconds)
{
    startupTimeout = seconds;
    maxRetries = (startupTimeout * 1000) / healthCheckInterval;
}

void ServerManager::checkServerHealth()
{
    if (currentState != Starting && currentState != Running) {
        return;
    }
    
    QNetworkRequest request(QUrl("http://127.0.0.1:8000/"));
    request.setRawHeader("User-Agent", "Recall-Client");
    request.setAttribute(QNetworkRequest::RedirectPolicyAttribute, 
                        QNetworkRequest::NoLessSafeRedirectPolicy);
    
    QNetworkReply *reply = networkManager->get(request);
    connect(reply, &QNetworkReply::finished, this, &ServerManager::onHealthCheckReply);
    
    // Set timeout for the request
    QTimer::singleShot(5000, reply, [reply]() {
        if (reply->isRunning()) {
            reply->abort();
        }
    });
}

void ServerManager::onProcessStarted()
{
    qDebug() << "Server process started successfully";
    healthCheckTimer->start(healthCheckInterval);
}

void ServerManager::onProcessFinished(int exitCode, QProcess::ExitStatus exitStatus)
{
    qDebug() << "Server process finished with exit code:" << exitCode;
    
    healthCheckTimer->stop();
    
    if (currentState == Stopping) {
        setState(Stopped);
    } else {
        setState(Error);
        emit serverError(QString("Server process exited unexpectedly (code: %1)").arg(exitCode));
    }
}

void ServerManager::onProcessError(QProcess::ProcessError error)
{
    QString errorString;
    switch (error) {
        case QProcess::FailedToStart:
            errorString = "Failed to start server process";
            break;
        case QProcess::Crashed:
            errorString = "Server process crashed";
            break;
        case QProcess::Timedout:
            errorString = "Server process timed out";
            break;
        default:
            errorString = "Unknown server process error";
            break;
    }
    
    qDebug() << "Server process error:" << errorString;
    setState(Error);
    emit serverError(errorString);
}

void ServerManager::onHealthCheckReply()
{
    QNetworkReply *reply = qobject_cast<QNetworkReply*>(sender());
    if (!reply) {
        return;
    }
    
    reply->deleteLater();
    
    if (reply->error() == QNetworkReply::NoError) {
        if (currentState == Starting) {
            qDebug() << "Server health check successful, server is ready";
            setState(Running);
            healthCheckTimer->stop();
            emit serverReady();
        }
    } else {
        retryCount++;
        qDebug() << "Health check failed, attempt" << retryCount << "of" << maxRetries;
        
        if (retryCount >= maxRetries) {
            healthCheckTimer->stop();
            setState(Error);
            emit serverError("Server failed to start within timeout period");
        }
    }
}

void ServerManager::setState(ServerState newState)
{
    if (currentState != newState) {
        currentState = newState;
        emit stateChanged(newState);
    }
}

QString ServerManager::findServerScript()
{
    QString appDirPath = QCoreApplication::applicationDirPath();
    QStringList possiblePaths = {
        "backend/server.py",
        "../backend/server.py",
        "../../backend/server.py",
        appDirPath + "/backend/server.py",
        appDirPath + "/../backend/server.py"
    };
    
    for (const QString &path : possiblePaths) {
        QFileInfo scriptCheck(path);
        if (scriptCheck.exists() && scriptCheck.isFile()) {
            qDebug() << "Found server script at:" << scriptCheck.absoluteFilePath();
            return scriptCheck.absoluteFilePath();
        }
    }
    
    qDebug() << "Could not find server.py script, using default path";
    return "../../backend/server.py";
}

QString ServerManager::determineWorkingDirectory()
{
    QString workingDir = QDir::current().absolutePath();
    
    if (workingDir.contains("build")) {
        QDir buildDir(workingDir);
        buildDir.cdUp(); // Go up from build/Desktop_Qt_6_9_0_MinGW_64_bit-Debug
        buildDir.cdUp(); // Go up to project root
        workingDir = buildDir.absolutePath();
        qDebug() << "Detected build environment, using project root:" << workingDir;
    }
    
    return workingDir;
}

void ServerManager::cleanupProcess()
{
    if (serverProcess) {
        serverProcess->disconnect();
        serverProcess->deleteLater();
        serverProcess = nullptr;
    }
}

// ============================================================================
// ResourceCache Implementation
// ============================================================================

ResourceCache::ResourceCache(QObject *parent)
    : QObject(parent),
    imageCache(100), // Default cache size
    animationCache(20),
    maxCacheSizeMB(100),
    hitCount(0),
    missCount(0)
{
    // Set cache size limits
    imageCache.setMaxCost(maxCacheSizeMB * 1024 * 1024); // Convert MB to bytes
}

ResourceCache::~ResourceCache()
{
    clearAllCaches();
}

QPixmap ResourceCache::getImage(const QString& path)
{
    QMutexLocker locker(&cacheMutex);
    
    QPixmap *cached = imageCache.object(path);
    if (cached) {
        updateCacheStats(true);
        return *cached;
    }
    
    updateCacheStats(false);
    
    // Load image and cache it
    QPixmap pixmap(path);
    if (!pixmap.isNull()) {
        imageCache.insert(path, new QPixmap(pixmap), pixmap.width() * pixmap.height() * 4);
    }
    
    return pixmap;
}

void ResourceCache::preloadImage(const QString& path)
{
    QMutexLocker locker(&cacheMutex);
    
    if (!imageCache.contains(path)) {
        QPixmap pixmap(path);
        if (!pixmap.isNull()) {
            imageCache.insert(path, new QPixmap(pixmap), pixmap.width() * pixmap.height() * 4);
            qDebug() << "Preloaded image:" << path;
        }
    }
}

void ResourceCache::clearImageCache()
{
    QMutexLocker locker(&cacheMutex);
    imageCache.clear();
    qDebug() << "Image cache cleared";
}

QMovie* ResourceCache::getAnimation(const QString& path)
{
    QMutexLocker locker(&cacheMutex);
    
    QMovie *cached = animationCache.object(path);
    if (cached) {
        updateCacheStats(true);
        return cached;
    }
    
    updateCacheStats(false);
    
    // Load animation and cache it
    QMovie *movie = new QMovie(path);
    if (movie->isValid()) {
        animationCache.insert(path, movie);
    } else {
        delete movie;
        movie = nullptr;
    }
    
    return movie;
}

void ResourceCache::preloadAnimation(const QString& path)
{
    QMutexLocker locker(&cacheMutex);
    
    if (!animationCache.contains(path)) {
        QMovie *movie = new QMovie(path);
        if (movie->isValid()) {
            animationCache.insert(path, movie);
            qDebug() << "Preloaded animation:" << path;
        } else {
            delete movie;
        }
    }
}

void ResourceCache::clearAnimationCache()
{
    QMutexLocker locker(&cacheMutex);
    animationCache.clear();
    qDebug() << "Animation cache cleared";
}

void ResourceCache::setCacheSize(int maxSizeMB)
{
    QMutexLocker locker(&cacheMutex);
    maxCacheSizeMB = maxSizeMB;
    imageCache.setMaxCost(maxSizeMB * 1024 * 1024);
}

int ResourceCache::getCacheSize() const
{
    QMutexLocker locker(&cacheMutex);
    return maxCacheSizeMB;
}

void ResourceCache::clearAllCaches()
{
    clearImageCache();
    clearAnimationCache();
}

double ResourceCache::getHitRatio() const
{
    QMutexLocker locker(&cacheMutex);
    int total = hitCount + missCount;
    return total > 0 ? (double)hitCount / total : 0.0;
}

void ResourceCache::updateCacheStats(bool hit)
{
    if (hit) {
        hitCount++;
    } else {
        missCount++;
    }
}

// ============================================================================
// PerformanceMonitor Implementation
// ============================================================================

PerformanceMonitor::PerformanceMonitor(QObject *parent)
    : QObject(parent),
    monitoringTimer(new QTimer(this)),
    monitoringInterval(5000),
    memoryThreshold(80),
    isMonitoring(false)
{
    connect(monitoringTimer, &QTimer::timeout, this, &PerformanceMonitor::collectPerformanceData);
}

PerformanceMonitor::~PerformanceMonitor()
{
    stopMonitoring();
}

void PerformanceMonitor::startMonitoring()
{
    if (!isMonitoring) {
        isMonitoring = true;
        monitoringTimer->start(monitoringInterval);
        qDebug() << "Performance monitoring started";
    }
}

void PerformanceMonitor::stopMonitoring()
{
    if (isMonitoring) {
        isMonitoring = false;
        monitoringTimer->stop();
        qDebug() << "Performance monitoring stopped";
    }
}

void PerformanceMonitor::recordOperation(const QString& operation, qint64 durationMs)
{
    QMutexLocker locker(&statsMutex);
    
    OperationStats &stats = operationStats[operation];
    stats.totalDuration += durationMs;
    stats.count++;
    
    if (stats.count == 1) {
        stats.maxDuration = stats.minDuration = durationMs;
    } else {
        stats.maxDuration = qMax(stats.maxDuration, durationMs);
        stats.minDuration = qMin(stats.minDuration, durationMs);
    }
    
    // Emit warning for slow operations
    if (durationMs > 1000) { // More than 1 second
        emit slowOperation(operation, durationMs);
    }
}

void PerformanceMonitor::recordMemoryUsage()
{
    QMutexLocker locker(&statsMutex);
    
    qint64 memoryUsage = getCurrentMemoryUsage();
    memoryUsageHistory.append(memoryUsage);
    
    // Keep only recent history
    if (memoryUsageHistory.size() > 100) {
        memoryUsageHistory.removeFirst();
    }
}

void PerformanceMonitor::recordNetworkOperation(const QString& operation, qint64 bytes, qint64 durationMs)
{
    recordOperation(QString("network_%1").arg(operation), durationMs);
    
    // Calculate network speed
    if (durationMs > 0) {
        double speedMBps = (bytes / 1024.0 / 1024.0) / (durationMs / 1000.0);
        qDebug() << "Network operation" << operation << "speed:" << speedMBps << "MB/s";
    }
}

void PerformanceMonitor::setMonitoringInterval(int milliseconds)
{
    monitoringInterval = milliseconds;
    if (monitoringTimer->isActive()) {
        monitoringTimer->setInterval(milliseconds);
    }
}

void PerformanceMonitor::setMemoryThreshold(int percentThreshold)
{
    memoryThreshold = percentThreshold;
}

void PerformanceMonitor::collectPerformanceData()
{
    QMutexLocker locker(&statsMutex);
    
    // Collect current performance data
    qint64 memoryUsage = getCurrentMemoryUsage();
    double cpuUsage = getCurrentCpuUsage();
    
    memoryUsageHistory.append(memoryUsage);
    cpuUsageHistory.append(static_cast<qint64>(cpuUsage * 100));
    
    // Clean up old data
    cleanupOldData();
    
    // Calculate memory percentage (simplified)
    double memoryPercent = 50.0; // Placeholder - would need platform-specific implementation
    
    // Emit performance update
    QVariantMap stats;
    stats["memoryUsage"] = memoryUsage;
    stats["memoryPercent"] = memoryPercent;
    stats["cpuUsage"] = cpuUsage;
    stats["operationCount"] = operationStats.size();
    
    emit performanceUpdate(stats);
    
    // Check memory threshold
    if (memoryPercent > memoryThreshold) {
        emit memoryWarning(static_cast<int>(memoryPercent));
    }
}

qint64 PerformanceMonitor::getCurrentMemoryUsage()
{
    // Simplified memory usage - would need platform-specific implementation
    return QCoreApplication::applicationPid() * 1024; // Placeholder
}

double PerformanceMonitor::getCurrentCpuUsage()
{
    // Simplified CPU usage - would need platform-specific implementation
    return 0.0; // Placeholder
}

void PerformanceMonitor::cleanupOldData()
{
    // Keep only recent history
    if (memoryUsageHistory.size() > 100) {
        memoryUsageHistory.removeFirst();
    }
    if (cpuUsageHistory.size() > 100) {
        cpuUsageHistory.removeFirst();
    }
}

