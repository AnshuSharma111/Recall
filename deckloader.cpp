#include "deckloader.h"

DeckLoader::DeckLoader(QObject *parent) : QObject(parent)
{
    networkManager = new QNetworkAccessManager(this);
    connect(networkManager, &QNetworkAccessManager::finished, this, &DeckLoader::handleNetworkReply);
}

void DeckLoader::loadDecks()
{
    // Request to get decks from the API
    QNetworkRequest request(QUrl("http://127.0.0.1:8000/api/decks"));
    
    // Add API key header as required by the server
    request.setRawHeader("X-API-Key", "key1");
    
    networkManager->get(request);
}

void DeckLoader::handleNetworkReply(QNetworkReply* reply)
{
    if (reply->error() == QNetworkReply::NoError) {
        // Parse JSON response
        QByteArray responseData = reply->readAll();
        QJsonDocument jsonDoc = QJsonDocument::fromJson(responseData);
        
        if (jsonDoc.isObject()) {
            QJsonObject jsonObj = jsonDoc.object();
            
            if (jsonObj.contains("decks") && jsonObj["decks"].isArray()) {
                QVector<DeckMetadata> deckList;
                QJsonArray decksArray = jsonObj["decks"].toArray();
                
                for (const QJsonValue& value : decksArray) {
                    if (value.isObject()) {
                        QJsonObject deckObj = value.toObject();
                        
                        DeckMetadata deck;
                        deck.deckId = deckObj["deck_id"].toString();
                        deck.title = deckObj["title"].toString();
                        deck.questionCount = deckObj["question_count"].toInt();
                        deck.createdAt = deckObj["created_at"].toString();
                        deck.lastModified = deckObj["last_modified"].toString();
                        
                        deckList.append(deck);
                    }
                }
                
                emit decksLoaded(deckList);
            } else {
                emit loadError("Invalid response format: missing decks array");
            }
        } else {
            emit loadError("Invalid JSON response");
        }
    } else {
        // Handle different types of errors
        int statusCode = reply->attribute(QNetworkRequest::HttpStatusCodeAttribute).toInt();
        
        if (statusCode == 401 || statusCode == 403) {
            emit loadError("Authentication error: API key is invalid or missing (Status: " + QString::number(statusCode) + ")");
        } else if (statusCode == 422) {
            emit loadError("Unprocessable entity: The server rejected the request format (Status: 422)");
        } else {
            emit loadError("Network error: " + reply->errorString() + " (Status: " + 
                          (statusCode > 0 ? QString::number(statusCode) : "unknown") + ")");
        }
        
        // Log the error details
        qDebug() << "API Error:" << reply->errorString();
        qDebug() << "Status code:" << statusCode;
        qDebug() << "Raw response:" << reply->readAll();
    }
    
    reply->deleteLater();
}
