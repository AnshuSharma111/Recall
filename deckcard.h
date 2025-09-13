#ifndef DECKCARD_H
#define DECKCARD_H

#include <QWidget>
#include <QLabel>
#include <QVBoxLayout>
#include "deckloader.h"  // For DeckMetadata struct

class DeckCard : public QWidget
{
    Q_OBJECT

public:
    explicit DeckCard(const DeckMetadata& deck, QWidget *parent = nullptr);
    QString getDeckId() const { return deckId; }

signals:
    void clicked(const QString& deckId);

protected:
    void mousePressEvent(QMouseEvent *event) override;
    void enterEvent(QEnterEvent *event) override;
    void leaveEvent(QEvent *event) override;
    void paintEvent(QPaintEvent *event) override;

private:
    QString deckId;
    QLabel *titleLabel;
    QLabel *countLabel;
    QLabel *dateLabel;
    
    void setupUi();
};

#endif // DECKCARD_H
