#ifndef MAINWINDOW_H
#define MAINWINDOW_H

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

#include "loadingscreen.h"
#include "deckgridview.h"

class MainWindow : public QMainWindow
{
    Q_OBJECT

public:
    explicit MainWindow(QWidget *parent = nullptr);
    ~MainWindow();

private slots:
    void onDeckSelected(const QString& deckId);
    void onCreateDeckClicked();
    void onSettingsClicked();

private:
    void checkHealth();
    void cleanupAndExit();
    void setupStartupScreen();
    void setupMainUI();
    
    QProcess *process; // server process
    QNetworkAccessManager *networkManager; // to access API
    QTimer *healthCheckTimer;
    int retryCount;
    const int maxRetries = 30;
    LoadingScreen *startupScreen;
    LoadingScreen *shutdownScreen;
    QString animationPath;
    
    // Main UI components
    DeckGridView *deckGridView;
};

#endif // MAINWINDOW_H
