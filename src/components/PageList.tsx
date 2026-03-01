import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const pages = [
  {
    title: "Tracker",
    description: "Compila la giornata, calcola e salva i dati del giorno.",
    to: "/tracker",
    action: "Apri Tracker",
  },
  {
    title: "Calendario",
    description: "Scegli una data e recupera subito la giornata salvata.",
    to: "/calendario",
    action: "Apri Calendario",
  },
  {
    title: "Archivio",
    description: "Visualizza tutte le giornate memorizzate in ordine data.",
    to: "/archivio",
    action: "Apri Archivio",
  },
  {
    title: "Impostazioni",
    description: "Attiva o disattiva l'autosalvataggio dei dati.",
    to: "/impostazioni",
    action: "Apri Impostazioni",
  },
];

const PageList = () => {
  return (
    <section className="grid w-full max-w-5xl gap-4 md:grid-cols-2">
      {pages.map((page) => (
        <Card key={page.to} className="h-full">
          <CardHeader>
            <CardTitle>{page.title}</CardTitle>
            <CardDescription>{page.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to={page.to}>{page.action}</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </section>
  );
};

export default PageList;