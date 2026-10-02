<script>
    import {___, use_trans, use_trans_choice} from '../../src/svelte'

    let {name, count} = $props()
    const greeting = $derived(use_trans('Welcome, :name!', {name}))
    const title = ___('Welcome!')
    const minutes = $derived(use_trans_choice('{1} :count minute ago|[2,*] :count minutes ago', count))
</script>

<p data-testid="script-greeting">{$greeting}</p>
<p data-testid="script-minutes">{$minutes}</p>
<input data-testid="script-input" placeholder={$greeting} />

<p data-testid="script-title">{$title}</p>
