import { Text } from 'react-native';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { normalizeBlocks, parseInline } from '@/lib/markdown';

type Props = Omit<ThemedTextProps, 'children'> & {
  children: string;
};

// Renders model output with its bold/italic/bullet markdown applied, as one
// Text block so wrapping and selection behave like plain text.
export function MarkdownText({ children, ...props }: Props) {
  const lines = normalizeBlocks(children).split('\n');

  return (
    <ThemedText {...props}>
      {lines.map((line, lineIndex) => (
        <Text key={lineIndex}>
          {parseInline(line).map((span, spanIndex) => (
            <Text
              key={spanIndex}
              style={[span.bold && { fontWeight: 700 }, span.italic && { fontStyle: 'italic' }]}>
              {span.text}
            </Text>
          ))}
          {lineIndex < lines.length - 1 ? '\n' : null}
        </Text>
      ))}
    </ThemedText>
  );
}
