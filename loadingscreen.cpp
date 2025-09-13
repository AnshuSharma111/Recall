#include "loadingscreen.h"
#include <QApplication>
#include <QPainter>
#include <QStyleOption>
#include <QFont>
#include <QScreen>
#include <QGuiApplication>
#include <QtCore>  // This includes QFileInfo

LoadingScreen::LoadingScreen(Type type, QWidget *parent)
    : QDialog(parent, Qt::FramelessWindowHint | Qt::WindowStaysOnTopHint), 
    currentPhraseIndex(0)
{
    setWindowModality(Qt::ApplicationModal);
    // Removed the translucent background to ensure dialog is visible
    
    // Initialize phrase lists based on type
    if (type == Startup) {
        phrases << "Starting server..."
               << "Shuffling decks..."
               << "Preparing flashcards..."
               << "Loading neural networks..."
               << "Analyzing study patterns..."
               << "Connecting to database..."
               << "Setting up memory systems..."
               << "Initializing spaced repetition..."
               << "Syncing knowledge base..."
               << "Getting things ready...";
    } else { // Shutdown
        phrases << "Saving progress..."
               << "Storing flashcards..."
               << "Wrapping things up..."
               << "Closing connections..."
               << "Shutting down server..."
               << "Securing your data..."
               << "Finalizing memory patterns..."
               << "Optimizing for next session..."
               << "Closing gracefully...";
    }
    
    setupUI(type);
    
    // Setup phrase rotation timer
    phraseTimer = new QTimer(this);
    connect(phraseTimer, &QTimer::timeout, [this]() {
        currentPhraseIndex = (currentPhraseIndex + 1) % phrases.size();
        phraseLabel->setText(phrases.at(currentPhraseIndex));
    });
    
    // Set a styled appearance with black theme
    setStyleSheet(
        "QDialog {"
        "   background-color: #121212;"  // Dark background color
        "   border-radius: 10px;"
        "   border: 1px solid #333333;"
        "}"
        "QLabel {"
        "   color: #FFFFFF;"  // White text
        "   font-family: 'Segoe UI', Arial, sans-serif;"
        "}"
        "QProgressBar {"
        "   border: 1px solid #444444;"
        "   border-radius: 5px;"
        "   background-color: #222222;"
        "   text-align: center;"
        "   height: 20px;"
        "   color: #FFFFFF;"  // White text
        "}"
        "QProgressBar::chunk {"
        "   background-color: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #8A2BE2, stop:1 #4B0082);" // Purple gradient
        "   border-radius: 5px;"
        "}"
    );
}

void LoadingScreen::setupUI(Type type)
{
    QVBoxLayout *mainLayout = new QVBoxLayout(this);
    mainLayout->setSpacing(15);
    mainLayout->setContentsMargins(20, 20, 20, 20);
    
    // Title label
    titleLabel = new QLabel(this);
    QFont titleFont = titleLabel->font();
    titleFont.setPointSize(14);
    titleFont.setBold(true);
    titleLabel->setFont(titleFont);
    titleLabel->setAlignment(Qt::AlignCenter);
    
    // Animation label
    animationLabel = new QLabel(this);
    animationLabel->setAlignment(Qt::AlignCenter);
    animationLabel->setMinimumSize(200, 150);
    loadingAnimation = new QMovie(this);
    loadingAnimation->setScaledSize(QSize(150, 150));
    animationLabel->setMovie(loadingAnimation);
    
    // Message label
    messageLabel = new QLabel(this);
    QFont messageFont = messageLabel->font();
    messageFont.setPointSize(10);
    messageLabel->setFont(messageFont);
    messageLabel->setAlignment(Qt::AlignCenter);
    messageLabel->setWordWrap(true);
    
    // Phrase label for rotating messages
    phraseLabel = new QLabel(this);
    QFont phraseFont = messageLabel->font();
    phraseFont.setPointSize(12);
    phraseFont.setItalic(true);
    phraseLabel->setFont(phraseFont);
    phraseLabel->setAlignment(Qt::AlignCenter);
    phraseLabel->setText(phrases.at(0)); // Start with the first phrase
    
    // Add widgets to layout
    mainLayout->addWidget(titleLabel);
    mainLayout->addWidget(animationLabel);
    mainLayout->addWidget(messageLabel);
    mainLayout->addWidget(phraseLabel);
    
    // Set content based on type
    if (type == Startup) {
        titleLabel->setText("Starting Recall");
        messageLabel->setText("Please wait while the server is starting...");
    } else { // Shutdown
        titleLabel->setText("Shutting Down");
        messageLabel->setText("Please wait while the application is closing...");
    }
    
    setLayout(mainLayout);
    setFixedSize(400, 300);
    
    // Center the dialog on the screen - using modern approach with QScreen
    QScreen *screen = QGuiApplication::primaryScreen();
    QRect screenGeometry = screen->geometry();
    move((screenGeometry.width() - width()) / 2, 
         (screenGeometry.height() - height()) / 2);
}

void LoadingScreen::startPhraseRotation()
{
    // Display initial phrase
    phraseLabel->setText(phrases.at(currentPhraseIndex));
    
    // Start the timer to rotate phrases every 2.5 seconds
    phraseTimer->start(2500);
}

void LoadingScreen::stopPhraseRotation()
{
    phraseTimer->stop();
    phraseLabel->setText("Complete");
}

void LoadingScreen::showErrorMessage(const QString &message)
{
    messageLabel->setText(message);
    messageLabel->setStyleSheet("color: #FF5252;"); // Red error color
    
    // Stop phrase rotation and show error
    if (phraseTimer) {
        phraseTimer->stop();
    }
    
    phraseLabel->setText("Error");
    phraseLabel->setStyleSheet("color: #FF5252;"); // Red error color
}

void LoadingScreen::setAnimationPath(const QString &path)
{
    qDebug() << "Attempting to load animation from:" << path;
    
    // Check if file exists before trying to load it
    QFile file(path);
    if (!file.exists()) {
        qDebug() << "Animation file does not exist at:" << path;
        // Set a fallback text
        animationLabel->setText("Loading...");
        QFont font = animationLabel->font();
        font.setPointSize(16);
        font.setBold(true);
        animationLabel->setFont(font);
        return;
    }
    
    loadingAnimation->stop();
    loadingAnimation->setFileName(path);
    
    // Check if the movie is valid
    if (loadingAnimation->isValid()) {
        qDebug() << "Animation loaded successfully from:" << path;
        loadingAnimation->start();
    } else {
        qDebug() << "Failed to load animation from:" << path << " (file exists but may be corrupt or invalid GIF)";
        // Set a fallback (show a static label with text)
        animationLabel->setText("Loading...");
        QFont font = animationLabel->font();
        font.setPointSize(16);
        font.setBold(true);
        animationLabel->setFont(font);
    }
}
