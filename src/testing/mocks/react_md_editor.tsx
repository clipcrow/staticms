// Mock component for react-md-editor to avoid CSS import issues in Deno tests
// deno-lint-ignore no-explicit-any
export default function MDEditor(props: any) {
  return (
    <div data-testid="mock-md-editor">
      <textarea
        data-testid="mock-md-editor-textarea"
        value={props.value}
        onChange={(e) => props.onChange && props.onChange(e.target.value)}
      />
    </div>
  );
}
