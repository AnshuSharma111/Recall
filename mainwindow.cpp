#include "MainWindow.h"
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

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent),
    process(new QProcess(this)),
    networkManager(new QNetworkAccessManager(this)),
    healthCheckTimer(new QTimer(this)),
    retryCount(0),
    startupScreen(nullptr),
    shutdownScreen(nullptr)
{
    // Use absolute path to ensure we can find the animation files
    QString appDirPath = QCoreApplication::applicationDirPath();
    
    // Find common directory for animations
    QString animationsDir = "";
    QStringList possibleDirs;
    possibleDirs << appDirPath + "/../../../static/images/"
                << "static/images/"
                << "../static/images/"
                << "../../static/images/"
                << appDirPath + "/static/images/";
    
    // Try to find the directory that contains our animations
    for (const QString &dir : possibleDirs) {
        QFileInfo loadingCheck(dir + "loading.gif");
        QFileInfo shutdownCheck(dir + "shutdown.gif");
        
        if (loadingCheck.exists()) {
            animationsDir = dir;
            qDebug() << "Found animations directory:" << animationsDir;
            break;
        }
    }
    
    if (animationsDir.isEmpty()) {
        qDebug() << "Could not find animations directory. Defaulting to static/images/";
        animationsDir = "static/images/";
    }
    
    // Set the path to loading.gif
    animationPath = animationsDir + "loading.gif";
    qDebug() << "Animation path set to:" << animationPath;
    
    // Check if shutdown.gif exists in the same directory
    QFileInfo shutdownFileInfo(animationsDir + "shutdown.gif");
    if (shutdownFileInfo.exists()) {
        qDebug() << "Shutdown animation found at:" << animationsDir + "shutdown.gif";
    } else {
        qDebug() << "Shutdown animation not found, will use loading.gif for shutdown screen too";
    }
    
    // Setup startup screen before launching the server
    setupStartupScreen();
    
    // Start the server process
    QString pythonPath = "python";
    QString scriptPath = "../../backend/server.py";

    process->start(pythonPath, QStringList() << scriptPath);

    if (!process->waitForStarted(5000)) {
        qDebug() << "Failed to start server process.";
        if (startupScreen) {
            startupScreen->showErrorMessage("Failed to start server process");
            QTimer::singleShot(3000, this, &MainWindow::cleanupAndExit);
        } else {
            QApplication::quit();
        }
        return;
    }

    qDebug() << "Python server process started.";
    
    // Start phrase rotation for server startup
    if (startupScreen) {
        startupScreen->startPhraseRotation();
    }

    // Setup health check timer
    connect(healthCheckTimer, &QTimer::timeout, this, &MainWindow::checkHealth);
    healthCheckTimer->start(10000); // Check every 10 seconds as in original code
}

void MainWindow::setupStartupScreen() {
    startupScreen = new LoadingScreen(LoadingScreen::Startup);
    
    // Set animation if the file exists
    QFileInfo animationFile(animationPath);
    if (animationFile.exists() && animationFile.isFile()) {
        qDebug() << "Loading animation from:" << animationPath;
        startupScreen->setAnimationPath(animationPath);
    } else {
        qDebug() << "Animation file not found at final path:" << animationPath;
    }
    
    startupScreen->show();
    QApplication::processEvents(); // Make sure the UI updates
}

// This method has been replaced with countdown functionality

void MainWindow::checkHealth() {
    QNetworkRequest request(QUrl("http://127.0.0.1:8000/"));
    QNetworkReply *reply = networkManager->get(request);

    connect(reply, &QNetworkReply::finished, this, [this, reply]() {
        if (reply->error() == QNetworkReply::NoError) {
            qDebug() << "Server is up!";
            healthCheckTimer->stop();
            
            // Server is up, stop phrase rotation and close the startup screen
            if (startupScreen) {
                startupScreen->stopPhraseRotation();
            }
            
            // Wait a moment to show the 100% progress, then close the startup screen
            QTimer::singleShot(500, this, [this]() {
                if (startupScreen) {
                    startupScreen->accept();
                    delete startupScreen;
                    startupScreen = nullptr;
                    
                    // Set up the main UI with deck grid
                    setupMainUI();
                    
                    // Now show the main window
                    show();
                    
                    // Load the decks
                    if (deckGridView) {
                        deckGridView->loadDecks();
                    }
                }
            });
        } else {
            retryCount++;
            qDebug() << "Health check failed. Attempt" << retryCount;
            
            // No need to update progress as we're using countdown timer now

            if (retryCount >= maxRetries) {
                qDebug() << "Server failed to start in time. Shutting down.";
                if (startupScreen) {
                    startupScreen->showErrorMessage("Server failed to start in time");
                    QTimer::singleShot(3000, this, &MainWindow::cleanupAndExit);
                } else {
                    cleanupAndExit();
                }
            }
        }
        reply->deleteLater();
    });
}

void MainWindow::cleanupAndExit() {
    // If the startup screen is still showing, close it
    if (startupScreen) {
        startupScreen->accept();
        delete startupScreen;
        startupScreen = nullptr;
    }
    
    // Create and show the shutdown loading screen
    shutdownScreen = new LoadingScreen(LoadingScreen::Shutdown, this);
    
    // Try to find a shutdown-specific animation first
    QString shutdownAnimPath = animationPath;
    shutdownAnimPath.replace("loading.gif", "shutdown.gif");
    
    QFileInfo shutdownAnimFile(shutdownAnimPath);
    if (shutdownAnimFile.exists() && shutdownAnimFile.isFile()) {
        qDebug() << "Loading shutdown animation from:" << shutdownAnimPath;
        shutdownScreen->setAnimationPath(shutdownAnimPath);
    } else {
        // Fall back to the original animation if shutdown-specific one doesn't exist
        QFileInfo animationFile(animationPath);
        if (animationFile.exists() && animationFile.isFile()) {
            qDebug() << "Loading fallback animation from:" << animationPath;
            shutdownScreen->setAnimationPath(animationPath);
        } else {
            qDebug() << "No animation files found. Tried: " << shutdownAnimPath << " and " << animationPath;
        }
    }
    
    shutdownScreen->show();
    QApplication::processEvents(); // Make sure the UI updates
    
    // Start phrase rotation for shutdown
    shutdownScreen->startPhraseRotation();
    
    // Use a nested event loop while waiting
    QEventLoop loop;

    if (process) {
        // We're about to terminate the server
        QApplication::processEvents();
        
        process->terminate();

        // Connect process finished signal to quit the nested event loop
        connect(process, QOverload<int, QProcess::ExitStatus>::of(&QProcess::finished),
                &loop, &QEventLoop::quit);

        // Start a timer in case it hangs
        QTimer timeoutTimer;
        timeoutTimer.setSingleShot(true);
        connect(&timeoutTimer, &QTimer::timeout, [this, &loop]() {
            shutdownScreen->showErrorMessage("Server shutdown is taking longer than expected");
            QApplication::processEvents();
            loop.quit();
        });
        timeoutTimer.start(40000); // 40 seconds timeout as in original code
        
        // We're waiting for the server to shut down
        QApplication::processEvents();
        
        loop.exec(); // wait for either finished or timeout

        if (process->state() != QProcess::NotRunning) {
            shutdownScreen->showErrorMessage("Forcefully closing server");
            QApplication::processEvents();
            
            process->kill();
            process->waitForFinished(3000);
        }
    }
    
    // Stop phrase rotation to show we're about to close
    shutdownScreen->stopPhraseRotation();
    QApplication::processEvents();
    
    // Wait a moment to show 100% before closing
    QTimer::singleShot(1000, []() {
        QApplication::quit();
    });
}

void MainWindow::setupMainUI() {
    // Set window properties
    setWindowTitle("Recall - Flashcard Study App");
    resize(1024, 768);
    
    // Create central widget
    QWidget *centralWidget = new QWidget(this);
    setCentralWidget(centralWidget);
    
    // Create main layout
    QVBoxLayout *mainLayout = new QVBoxLayout(centralWidget);
    
    // Create header with modern design
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
    
    // Add some padding to the header
    headerLayout->setContentsMargins(20, 20, 20, 20);
    
    // Add header to main layout
    mainLayout->addWidget(header);
    
    // Create deck grid view
    deckGridView = new DeckGridView(centralWidget);
    connect(deckGridView, &DeckGridView::deckSelected, this, &MainWindow::onDeckSelected);
    
    // Add deck grid to main layout
    mainLayout->addWidget(deckGridView, 1); // Stretch factor of 1
    
    // Create a container for the buttons
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
    
    // Add buttons to button layout
    buttonLayout->addWidget(createDeckButton);
    buttonLayout->addStretch();
    buttonLayout->addWidget(settingsButton);
    buttonLayout->setContentsMargins(20, 10, 20, 20);
    
    // Add button container to main layout
    mainLayout->addWidget(buttonContainer);
    
    // Set layout for central widget
    centralWidget->setLayout(mainLayout);
    
    // Apply modern dark stylesheet
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

MainWindow::~MainWindow() {
    if (!startupScreen && !shutdownScreen) {
        cleanupAndExit();
    }
}
