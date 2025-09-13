#ifndef DECKLOADER_H
#define DECKLOADER_H

#include <QObject>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QVector>
#include <QString>

// Struct to hold deck metadata
struct DeckMetadata {
    QString deckId;
    QString title;
    int questionCount;
    QString createdAt;
    QString lastModified;
};

class DeckLoader : public QObject
{
    Q_OBJECT

public:
    explicit DeckLoader(QObject *parent = nullptr);
    void loadDecks();

signals:
    void decksLoaded(const QVector<DeckMetadata>& decks);
    void loadError(const QString& errorMessage);

private slots:
    void handleNetworkReply(QNetworkReply* reply);

private:
    QNetworkAccessManager* networkManager;
};

#endif // DECKLOADER_H
