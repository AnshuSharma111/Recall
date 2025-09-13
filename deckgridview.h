#ifndef DECKGRIDVIEW_H
#define DECKGRIDVIEW_H

#include <QWidget>
#include <QScrollArea>
#include <QGridLayout>
#include <QVector>
#include "deckloader.h"
#include "deckcard.h"

class DeckGridView : public QWidget
{
    Q_OBJECT
    
public:
    explicit DeckGridView(QWidget *parent = nullptr);
    void loadDecks();

signals:
    void deckSelected(const QString& deckId);
    
private slots:
    void onDecksLoaded(const QVector<DeckMetadata>& decks);
    void onLoadError(const QString& errorMessage);
    void onDeckCardClicked(const QString& deckId);

private:
    QScrollArea *scrollArea;
    QWidget *gridContainer;
    QGridLayout *gridLayout;
    DeckLoader *deckLoader;
    
    void clearGrid();
};

#endif // DECKGRIDVIEW_H
