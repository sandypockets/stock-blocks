type SvgAttributeValue = string | number | boolean | null | undefined;

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export function createSvgElement<K extends keyof SVGElementTagNameMap>(
	doc: Document,
	tagName: K,
	attributes: Record<string, SvgAttributeValue> = {}
): SVGElementTagNameMap[K] {
	const element = doc.createElementNS(SVG_NAMESPACE, tagName);
	setSvgAttributes(element, attributes);
	return element;
}

export function appendSvgElement<K extends keyof SVGElementTagNameMap>(
	parent: Element,
	tagName: K,
	attributes: Record<string, SvgAttributeValue> = {},
	text?: string
): SVGElementTagNameMap[K] {
	const element = createSvgElement(parent.ownerDocument, tagName, attributes);
	if (text !== undefined) {
		element.textContent = text;
	}
	parent.appendChild(element);
	return element;
}

export function setSvgAttributes(
	element: SVGElement,
	attributes: Record<string, SvgAttributeValue>
): void {
	for (const [name, value] of Object.entries(attributes)) {
		if (value === null || value === undefined) {
			continue;
		}
		element.setAttribute(name, String(value));
	}
}
