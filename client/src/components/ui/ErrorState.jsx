import Button from "./Button";
export default function ErrorState({ message, retry }) {
  return (
    <div className="state" role="alert">
      <h2>We couldn’t load this information</h2>
      <p className="muted">{message}</p>
      {retry && (
        <Button variant="secondary" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
