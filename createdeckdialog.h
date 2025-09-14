#ifndef CREATEDECKDIALOG_H
#define CREATEDECKDIALOG_H

#include <QDialog>
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QListWidget>
#include <QFileDialog>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QHttpMultiPart>
#include <QMimeDatabase>
#include <QProgressBar>
#include <QMessageBox>
#include <QScrollArea>
#include <QDragEnterEvent>
#include <QDropEvent>
#include <QMimeData>
#include <QTimer>

class CreateDeckDialog : public QDialog
{
    Q_OBJECT

public:
    enum class DialogState {
        Idle,
        Processing,
        Complete,
        Error
    };

    explicit CreateDeckDialog(QWidget *parent = nullptr);
    ~CreateDeckDialog();

protected:
    void dragEnterEvent(QDragEnterEvent *event) override;
    void dropEvent(QDropEvent *event) override;
    
private slots:
    void onAddFilesClicked();
    void onRemoveFileClicked();
    void onCreateDeckClicked();
    void onUploadProgress(qint64 bytesSent, qint64 bytesTotal);
    void onNetworkReplyFinished();
    void updateCreateButtonState();
    void checkProcessingStatus();
    void onStatusCheckFinished();

private:
    void setupUI();
    void addFiles(const QStringList &filePaths);
    bool validateFile(const QString &filePath);
    void startStatusPolling();
    void stopStatusPolling();
    bool isCompletionStatus(const QString &status);
    
    // State management methods
    void setState(DialogState newState);
    void enableControls(bool enabled);
    void updateUIForState();
    
    QLineEdit *titleEdit;
    QListWidget *fileListWidget;
    QPushButton *addFilesButton;
    QPushButton *removeFileButton;
    QPushButton *createDeckButton;
    QPushButton *cancelButton;
    QProgressBar *uploadProgressBar;
    QLabel *statusLabel;
    QLabel *progressLabel;
    
    QNetworkAccessManager *networkManager;
    QNetworkReply *currentReply;
    QNetworkReply *statusReply;
    QTimer *statusTimer;
    QString deckId;
    bool processingComplete;
    int pollingCounter;
    int consecutiveErrorCount;
    bool backgroundModeOffered;
    
    // State management
    DialogState currentState;
    
    // Performance optimization variables
    int basePollingInterval;     // Base polling interval in ms (2 seconds)
    int maxPollingInterval;      // Maximum polling interval in ms (10 seconds)
    int currentPollingInterval;  // Current adaptive polling interval
};

#endif // CREATEDECKDIALOG_H