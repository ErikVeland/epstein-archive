/**
 * @license
 * Copyright 2023 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
export const json = [
    {
        'tfOpName': 'StaticRegexReplace',
        'category': 'string',
        'inputs': [
            {
                'start': 0,
                'name': 'input',
                'type': 'tensor'
            }
        ],
        'attrs': [
            {
                'tfName': 'pattern',
                'name': 'pattern',
                'type': 'string'
            },
            {
                'tfName': 'rewrite',
                'name': 'rewrite',
                'type': 'string'
            },
            {
                'tfName': 'replace_global',
                'name': 'replaceGlobal',
                'type': 'bool'
            }
        ]
    },
    {
        'tfOpName': 'StringNGrams',
        'category': 'string',
        'inputs': [
            {
                'start': 0,
                'name': 'data',
                'type': 'tensor'
            },
            {
                'start': 1,
                'name': 'dataSplits',
                'type': 'tensor'
            }
        ],
        'attrs': [
            {
                'tfName': 'separator',
                'name': 'separator',
                'type': 'string'
            },
            {
                'tfName': 'ngram_widths',
                'name': 'nGramWidths',
                'type': 'number[]'
            },
            {
                'tfName': 'left_pad',
                'name': 'leftPad',
                'type': 'string'
            },
            {
                'tfName': 'right_pad',
                'name': 'rightPad',
                'type': 'string'
            },
            {
                'tfName': 'pad_width',
                'name': 'padWidth',
                'type': 'number'
            },
            {
                'tfName': 'preserve_short_sequences',
                'name': 'preserveShortSequences',
                'type': 'bool'
            }
        ],
        'outputs': [
            'ngrams',
            'ngrams_splits'
        ]
    },
    {
        'tfOpName': 'StringSplit',
        'category': 'string',
        'inputs': [
            {
                'start': 0,
                'name': 'input',
                'type': 'tensor'
            },
            {
                'start': 1,
                'name': 'delimiter',
                'type': 'tensor'
            }
        ],
        'attrs': [
            {
                'tfName': 'skip_empty',
                'name': 'skipEmpty',
                'type': 'bool'
            }
        ],
        'outputs': [
            'indices',
            'values',
            'shape'
        ]
    },
    {
        'tfOpName': 'StringToHashBucketFast',
        'category': 'string',
        'inputs': [
            {
                'start': 0,
                'name': 'input',
                'type': 'tensor'
            }
        ],
        'attrs': [
            {
                'tfName': 'num_buckets',
                'name': 'numBuckets',
                'type': 'number'
            }
        ]
    }
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyaW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vdGZqcy1jb252ZXJ0ZXIvc3JjL29wZXJhdGlvbnMvb3BfbGlzdC9zdHJpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0E7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBSUgsTUFBTSxDQUFDLE1BQU0sSUFBSSxHQUFlO0lBQzlCO1FBQ0UsVUFBVSxFQUFFLG9CQUFvQjtRQUNoQyxVQUFVLEVBQUUsUUFBUTtRQUNwQixRQUFRLEVBQUU7WUFDUjtnQkFDQSxPQUFPLEVBQUUsQ0FBQztnQkFDUixNQUFNLEVBQUUsT0FBTztnQkFDZixNQUFNLEVBQUUsUUFBUTthQUNqQjtTQUNGO1FBQ0QsT0FBTyxFQUFFO1lBQ1A7Z0JBQ0UsUUFBUSxFQUFFLFNBQVM7Z0JBQ25CLE1BQU0sRUFBRSxTQUFTO2dCQUNqQixNQUFNLEVBQUUsUUFBUTthQUNqQjtZQUNEO2dCQUNFLFFBQVEsRUFBRSxTQUFTO2dCQUNuQixNQUFNLEVBQUUsU0FBUztnQkFDakIsTUFBTSxFQUFFLFFBQVE7YUFDakI7WUFDRDtnQkFDRSxRQUFRLEVBQUUsZ0JBQWdCO2dCQUMxQixNQUFNLEVBQUUsZUFBZTtnQkFDdkIsTUFBTSxFQUFFLE1BQU07YUFDZjtTQUNGO0tBQ0Y7SUFDRDtRQUNFLFVBQVUsRUFBRSxjQUFjO1FBQzFCLFVBQVUsRUFBRSxRQUFRO1FBQ3BCLFFBQVEsRUFBRTtZQUNSO2dCQUNFLE9BQU8sRUFBRSxDQUFDO2dCQUNWLE1BQU0sRUFBRSxNQUFNO2dCQUNkLE1BQU0sRUFBRSxRQUFRO2FBQ2pCO1lBQ0Q7Z0JBQ0UsT0FBTyxFQUFFLENBQUM7Z0JBQ1YsTUFBTSxFQUFFLFlBQVk7Z0JBQ3BCLE1BQU0sRUFBRSxRQUFRO2FBQ2pCO1NBQ0Y7UUFDRCxPQUFPLEVBQUU7WUFDUDtnQkFDRSxRQUFRLEVBQUUsV0FBVztnQkFDckIsTUFBTSxFQUFFLFdBQVc7Z0JBQ25CLE1BQU0sRUFBRSxRQUFRO2FBQ2pCO1lBQ0Q7Z0JBQ0UsUUFBUSxFQUFFLGNBQWM7Z0JBQ3hCLE1BQU0sRUFBRSxhQUFhO2dCQUNyQixNQUFNLEVBQUUsVUFBVTthQUNuQjtZQUNEO2dCQUNFLFFBQVEsRUFBRSxVQUFVO2dCQUNwQixNQUFNLEVBQUUsU0FBUztnQkFDakIsTUFBTSxFQUFFLFFBQVE7YUFDakI7WUFDRDtnQkFDRSxRQUFRLEVBQUUsV0FBVztnQkFDckIsTUFBTSxFQUFFLFVBQVU7Z0JBQ2xCLE1BQU0sRUFBRSxRQUFRO2FBQ2pCO1lBQ0Q7Z0JBQ0UsUUFBUSxFQUFFLFdBQVc7Z0JBQ3JCLE1BQU0sRUFBRSxVQUFVO2dCQUNsQixNQUFNLEVBQUUsUUFBUTthQUNqQjtZQUNEO2dCQUNFLFFBQVEsRUFBRSwwQkFBMEI7Z0JBQ3BDLE1BQU0sRUFBRSx3QkFBd0I7Z0JBQ2hDLE1BQU0sRUFBRSxNQUFNO2FBQ2Y7U0FDRjtRQUNELFNBQVMsRUFBRTtZQUNULFFBQVE7WUFDUixlQUFlO1NBQ2hCO0tBQ0Y7SUFDRDtRQUNFLFVBQVUsRUFBRSxhQUFhO1FBQ3pCLFVBQVUsRUFBRSxRQUFRO1FBQ3BCLFFBQVEsRUFBRTtZQUNSO2dCQUNFLE9BQU8sRUFBRSxDQUFDO2dCQUNWLE1BQU0sRUFBRSxPQUFPO2dCQUNmLE1BQU0sRUFBRSxRQUFRO2FBQ2pCO1lBQ0Q7Z0JBQ0UsT0FBTyxFQUFFLENBQUM7Z0JBQ1YsTUFBTSxFQUFFLFdBQVc7Z0JBQ25CLE1BQU0sRUFBRSxRQUFRO2FBQ2pCO1NBQ0Y7UUFDRCxPQUFPLEVBQUU7WUFDUDtnQkFDRSxRQUFRLEVBQUUsWUFBWTtnQkFDdEIsTUFBTSxFQUFFLFdBQVc7Z0JBQ25CLE1BQU0sRUFBRSxNQUFNO2FBQ2Y7U0FDRjtRQUNELFNBQVMsRUFBRTtZQUNULFNBQVM7WUFDVCxRQUFRO1lBQ1IsT0FBTztTQUNSO0tBQ0Y7SUFDRDtRQUNFLFVBQVUsRUFBRSx3QkFBd0I7UUFDcEMsVUFBVSxFQUFFLFFBQVE7UUFDcEIsUUFBUSxFQUFFO1lBQ1I7Z0JBQ0UsT0FBTyxFQUFFLENBQUM7Z0JBQ1YsTUFBTSxFQUFFLE9BQU87Z0JBQ2YsTUFBTSxFQUFFLFFBQVE7YUFDakI7U0FDRjtRQUNELE9BQU8sRUFBRTtZQUNQO2dCQUNFLFFBQVEsRUFBRSxhQUFhO2dCQUN2QixNQUFNLEVBQUUsWUFBWTtnQkFDcEIsTUFBTSxFQUFFLFFBQVE7YUFDakI7U0FDRjtLQUNGO0NBQ0YsQ0FDQSIsInNvdXJjZXNDb250ZW50IjpbIlxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjMgR29vZ2xlIExMQy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG5pbXBvcnQge09wTWFwcGVyfSBmcm9tICcuLi90eXBlcyc7XG5cbmV4cG9ydCBjb25zdCBqc29uOiBPcE1hcHBlcltdID0gW1xuICB7XG4gICAgJ3RmT3BOYW1lJzogJ1N0YXRpY1JlZ2V4UmVwbGFjZScsXG4gICAgJ2NhdGVnb3J5JzogJ3N0cmluZycsXG4gICAgJ2lucHV0cyc6IFtcbiAgICAgIHtcbiAgICAgICdzdGFydCc6IDAsXG4gICAgICAgICduYW1lJzogJ2lucHV0JyxcbiAgICAgICAgJ3R5cGUnOiAndGVuc29yJ1xuICAgICAgfVxuICAgIF0sXG4gICAgJ2F0dHJzJzogW1xuICAgICAge1xuICAgICAgICAndGZOYW1lJzogJ3BhdHRlcm4nLFxuICAgICAgICAnbmFtZSc6ICdwYXR0ZXJuJyxcbiAgICAgICAgJ3R5cGUnOiAnc3RyaW5nJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgJ3RmTmFtZSc6ICdyZXdyaXRlJyxcbiAgICAgICAgJ25hbWUnOiAncmV3cml0ZScsXG4gICAgICAgICd0eXBlJzogJ3N0cmluZydcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgICd0Zk5hbWUnOiAncmVwbGFjZV9nbG9iYWwnLFxuICAgICAgICAnbmFtZSc6ICdyZXBsYWNlR2xvYmFsJyxcbiAgICAgICAgJ3R5cGUnOiAnYm9vbCdcbiAgICAgIH1cbiAgICBdXG4gIH0sXG4gIHtcbiAgICAndGZPcE5hbWUnOiAnU3RyaW5nTkdyYW1zJyxcbiAgICAnY2F0ZWdvcnknOiAnc3RyaW5nJyxcbiAgICAnaW5wdXRzJzogW1xuICAgICAge1xuICAgICAgICAnc3RhcnQnOiAwLFxuICAgICAgICAnbmFtZSc6ICdkYXRhJyxcbiAgICAgICAgJ3R5cGUnOiAndGVuc29yJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgJ3N0YXJ0JzogMSxcbiAgICAgICAgJ25hbWUnOiAnZGF0YVNwbGl0cycsXG4gICAgICAgICd0eXBlJzogJ3RlbnNvcidcbiAgICAgIH1cbiAgICBdLFxuICAgICdhdHRycyc6IFtcbiAgICAgIHtcbiAgICAgICAgJ3RmTmFtZSc6ICdzZXBhcmF0b3InLFxuICAgICAgICAnbmFtZSc6ICdzZXBhcmF0b3InLFxuICAgICAgICAndHlwZSc6ICdzdHJpbmcnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICAndGZOYW1lJzogJ25ncmFtX3dpZHRocycsXG4gICAgICAgICduYW1lJzogJ25HcmFtV2lkdGhzJyxcbiAgICAgICAgJ3R5cGUnOiAnbnVtYmVyW10nXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICAndGZOYW1lJzogJ2xlZnRfcGFkJyxcbiAgICAgICAgJ25hbWUnOiAnbGVmdFBhZCcsXG4gICAgICAgICd0eXBlJzogJ3N0cmluZydcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgICd0Zk5hbWUnOiAncmlnaHRfcGFkJyxcbiAgICAgICAgJ25hbWUnOiAncmlnaHRQYWQnLFxuICAgICAgICAndHlwZSc6ICdzdHJpbmcnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICAndGZOYW1lJzogJ3BhZF93aWR0aCcsXG4gICAgICAgICduYW1lJzogJ3BhZFdpZHRoJyxcbiAgICAgICAgJ3R5cGUnOiAnbnVtYmVyJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgJ3RmTmFtZSc6ICdwcmVzZXJ2ZV9zaG9ydF9zZXF1ZW5jZXMnLFxuICAgICAgICAnbmFtZSc6ICdwcmVzZXJ2ZVNob3J0U2VxdWVuY2VzJyxcbiAgICAgICAgJ3R5cGUnOiAnYm9vbCdcbiAgICAgIH1cbiAgICBdLFxuICAgICdvdXRwdXRzJzogW1xuICAgICAgJ25ncmFtcycsXG4gICAgICAnbmdyYW1zX3NwbGl0cydcbiAgICBdXG4gIH0sXG4gIHtcbiAgICAndGZPcE5hbWUnOiAnU3RyaW5nU3BsaXQnLFxuICAgICdjYXRlZ29yeSc6ICdzdHJpbmcnLFxuICAgICdpbnB1dHMnOiBbXG4gICAgICB7XG4gICAgICAgICdzdGFydCc6IDAsXG4gICAgICAgICduYW1lJzogJ2lucHV0JyxcbiAgICAgICAgJ3R5cGUnOiAndGVuc29yJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgJ3N0YXJ0JzogMSxcbiAgICAgICAgJ25hbWUnOiAnZGVsaW1pdGVyJyxcbiAgICAgICAgJ3R5cGUnOiAndGVuc29yJ1xuICAgICAgfVxuICAgIF0sXG4gICAgJ2F0dHJzJzogW1xuICAgICAge1xuICAgICAgICAndGZOYW1lJzogJ3NraXBfZW1wdHknLFxuICAgICAgICAnbmFtZSc6ICdza2lwRW1wdHknLFxuICAgICAgICAndHlwZSc6ICdib29sJ1xuICAgICAgfVxuICAgIF0sXG4gICAgJ291dHB1dHMnOiBbXG4gICAgICAnaW5kaWNlcycsXG4gICAgICAndmFsdWVzJyxcbiAgICAgICdzaGFwZSdcbiAgICBdXG4gIH0sXG4gIHtcbiAgICAndGZPcE5hbWUnOiAnU3RyaW5nVG9IYXNoQnVja2V0RmFzdCcsXG4gICAgJ2NhdGVnb3J5JzogJ3N0cmluZycsXG4gICAgJ2lucHV0cyc6IFtcbiAgICAgIHtcbiAgICAgICAgJ3N0YXJ0JzogMCxcbiAgICAgICAgJ25hbWUnOiAnaW5wdXQnLFxuICAgICAgICAndHlwZSc6ICd0ZW5zb3InXG4gICAgICB9XG4gICAgXSxcbiAgICAnYXR0cnMnOiBbXG4gICAgICB7XG4gICAgICAgICd0Zk5hbWUnOiAnbnVtX2J1Y2tldHMnLFxuICAgICAgICAnbmFtZSc6ICdudW1CdWNrZXRzJyxcbiAgICAgICAgJ3R5cGUnOiAnbnVtYmVyJ1xuICAgICAgfVxuICAgIF1cbiAgfVxuXVxuO1xuIl19