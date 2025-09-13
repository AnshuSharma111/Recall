#ifndef LOADINGSCREEN_H
#define LOADINGSCREEN_H

#include <QDialog>
#include <QLabel>
#include <QProgressBar>
#include <QMovie>
#include <QTimer>
#include <QVBoxLayout>

class LoadingScreen : public QDialog
{
    Q_OBJECT

public:
    enum Type { Startup, Shutdown };

    explicit LoadingScreen(Type type, QWidget *parent = nullptr);
    void showErrorMessage(const QString &message);
    void setAnimationPath(const QString &path);
    void startPhraseRotation();
    void stopPhraseRotation();

private:
    QLabel *titleLabel;
    QLabel *messageLabel;
    QLabel *animationLabel;
    QLabel *phraseLabel;     // Label for rotating phrases
    QMovie *loadingAnimation;
    QTimer *phraseTimer;     // Timer for rotating phrases
    QStringList phrases;     // List of phrases to rotate
    int currentPhraseIndex;
    
    void setupUI(Type type);
};

#endif // LOADINGSCREEN_H
